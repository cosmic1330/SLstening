import * as Sentry from "@sentry/react";
import { error as writeErrorLog } from "@tauri-apps/plugin-log";
import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { useTranslation } from "react-i18next";

const DSN = "https://92d68526bd07d01956180a9ff39b4134@o4512236734578688.ingest.us.sentry.io/4512236741853184";
const SAFE_TAG_KEYS = new Set(["operation", "code", "route"]);
const CLOUD_COOLDOWN_MS = 30_000;
const lastCloudReport = new Map<string, number>();
let initialized = false;

type DiagnosticEvent = Parameters<
  NonNullable<Parameters<typeof Sentry.init>[0]["beforeSend"]>
>[0];

const isNativeRuntime = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const safeRoute = (pathname: string) =>
  pathname.startsWith("/detail/") ? "/detail/:id" : pathname;

const safeSourcePath = (value: string | undefined) => {
  if (!value) return value;
  try {
    const url = new URL(value, window.location.origin);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.split(/[?#]/, 1)[0];
  }
};

function writeLocalError(operation: string, code: string) {
  if (!isNativeRuntime()) {
    console.error(`[${operation}] ${code}`);
    return;
  }
  void writeErrorLog(`[${operation}] ${code}`).catch(() => undefined);
}

/** Keep only the minimum metadata needed to group and symbolicate an error. */
export function sanitizeDiagnosticEvent(event: DiagnosticEvent): DiagnosticEvent {
  const tags = Object.fromEntries(
    Object.entries(event.tags ?? {}).filter(([key]) => SAFE_TAG_KEYS.has(key)),
  );
  if (typeof tags.route === "string") tags.route = safeRoute(tags.route);
  const safeValue =
    typeof tags.code === "string" ? tags.code : "UNHANDLED_APPLICATION_ERROR";
  const exception = event.exception
    ? {
        ...event.exception,
        values: event.exception.values?.map((value) => ({
          ...value,
          value: safeValue,
          stacktrace: value.stacktrace
            ? {
                ...value.stacktrace,
                frames: value.stacktrace.frames?.map((frame) => ({
                  ...frame,
                  filename: safeSourcePath(frame.filename),
                  abs_path: safeSourcePath(frame.abs_path),
                  pre_context: undefined,
                  context_line: undefined,
                  post_context: undefined,
                  vars: undefined,
                })),
              }
            : value.stacktrace,
          mechanism: value.mechanism
            ? { ...value.mechanism, data: undefined }
            : value.mechanism,
        })),
      }
    : event.exception;

  return {
    ...event,
    message: event.message ? safeValue : undefined,
    exception,
    user: event.user?.id ? { id: event.user.id } : undefined,
    request: undefined,
    breadcrumbs: [],
    contexts: {},
    extra: undefined,
    tags,
  };
}

export function initializeDiagnostics() {
  if (!import.meta.env.PROD || initialized) return;
  initialized = true;
  Sentry.init({
    dsn: DSN,
    environment: "production",
    release: import.meta.env.VITE_SENTRY_RELEASE,
    tracesSampleRate: 0,
    beforeSend: sanitizeDiagnosticEvent,
  });

  window.addEventListener("error", () => {
    writeLocalError("webview_unhandled", "WEBVIEW_UNHANDLED_ERROR");
  });
  window.addEventListener("unhandledrejection", () => {
    writeLocalError(
      "webview_unhandled_rejection",
      "WEBVIEW_UNHANDLED_REJECTION",
    );
  });
}

export function setDiagnosticsUser(id: string | null) {
  if (import.meta.env.PROD) Sentry.setUser(id ? { id } : null);
}

export function reportHandledError(
  operation: string,
  error: unknown,
  code = "OPERATION_FAILED",
) {
  writeLocalError(operation, code);
  if (!import.meta.env.PROD) return;

  const key = `${operation}:${code}`;
  const now = Date.now();
  if (now - (lastCloudReport.get(key) ?? 0) < CLOUD_COOLDOWN_MS) return;
  lastCloudReport.set(key, now);

  Sentry.withScope((scope) => {
    scope.setTags({ operation, code, route: safeRoute(window.location.pathname) });
    // Preserve the original stack for source-map symbolication. beforeSend
    // replaces the exception message and removes private event payloads.
    Sentry.captureException(error instanceof Error ? error : new Error(code));
  });
}

function DiagnosticsFallback() {
  const { t } = useTranslation();
  return (
    <main role="alert">
      <p>{t("diagnostics.crashTitle")}</p>
      <button type="button" onClick={() => window.location.reload()}>
        {t("diagnostics.reload")}
      </button>
    </main>
  );
}

export class DiagnosticsErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    reportHandledError("react_render", error, "REACT_RENDER_FAILED");
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <DiagnosticsFallback />;
  }
}
