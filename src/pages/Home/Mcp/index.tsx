import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EditIcon from "@mui/icons-material/Edit";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HubIcon from "@mui/icons-material/Hub";
import SearchIcon from "@mui/icons-material/Search";
import SecurityIcon from "@mui/icons-material/Security";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { WATCHLIST_RADIUS } from "../../../components/StockBox/constants";
import type { McpGatewayStatus } from "../../../store/mcp.store";
import useMcpGatewayStore from "../../../store/mcp.store";
import { primitiveTokens, semanticTokens } from "../../../theme";
import { MCP_TOOL_GROUPS } from "./toolCatalog";

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function escapeTomlBasicString(value: string): string {
  const escapes: Record<string, string> = {
    "\\": "\\\\",
    '"': '\\"',
    "\b": "\\b",
    "\t": "\\t",
    "\n": "\\n",
    "\f": "\\f",
    "\r": "\\r",
  };
  return Array.from(value, (character) => {
    if (escapes[character]) return escapes[character];
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) return `\\u${code.toString(16).padStart(4, "0")}`;
    return character;
  }).join("");
}

export function buildCodexMcpConfig(bridgePath: string): string {
  return [
    "[mcp_servers.slistening]",
    'command = "node"',
    `args = ["${escapeTomlBasicString(bridgePath)}"]`,
  ].join("\n");
}

export function buildGenericMcpConfig(bridgePath: string): string {
  return JSON.stringify({
    mcpServers: {
      slistening: {
        command: "node",
        args: [bridgePath],
      },
    },
  }, null, 2);
}

export function formatMcpRelativeTime(timestamp: number | null, now: number, t: Translate): string {
  if (timestamp === null) return t("mcp.noActivity");
  const elapsed = Math.max(0, now - timestamp);
  if (elapsed < 5_000) return t("mcp.justNow");
  const seconds = Math.floor(elapsed / 1_000);
  if (seconds < 60) return t("mcp.secondsAgo", { count: seconds });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("mcp.minutesAgo", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("mcp.hoursAgo", { count: hours });
  return t("mcp.daysAgo", { count: Math.floor(hours / 24) });
}

const STATUS_COLORS: Record<McpGatewayStatus, string> = {
  unavailable: primitiveTokens.color.disabledBorder,
  ready: semanticTokens.market.warning,
  active: semanticTokens.market.loss,
};

const STATUS_ICONS: Record<McpGatewayStatus, typeof HubIcon> = {
  unavailable: ErrorOutlineIcon,
  ready: WarningAmberIcon,
  active: HubIcon,
};

function useRelativeClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function StatusCard({ status, lastActivityAt, now, t }: {
  status: McpGatewayStatus;
  lastActivityAt: number | null;
  now: number;
  t: Translate;
}) {
  const Icon = STATUS_ICONS[status];
  const statusLabel = t(`mcp.status.${status}`);
  return (
    <Card component="section" aria-labelledby="mcp-status-title" sx={{ borderRadius: WATCHLIST_RADIUS, bgcolor: semanticTokens.app.surfaceStrong, border: `2px solid ${semanticTokens.app.border}`, boxShadow: primitiveTokens.shadow.panel }}>
      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}>
        <Stack direction="row" alignItems="flex-start" spacing={1.25}>
          <Box sx={{ display: "grid", placeItems: "center", flexShrink: 0, width: 42, height: 42, borderRadius: WATCHLIST_RADIUS, bgcolor: STATUS_COLORS[status], color: primitiveTokens.color.ink, border: `2px solid ${semanticTokens.app.border}` }}>
            <Icon aria-hidden="true" fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography id="mcp-status-title" variant="overline" sx={{ color: semanticTokens.app.textMuted, fontWeight: 800, letterSpacing: "0.08em" }}>{t("mcp.statusTitle")}</Typography>
            <Stack direction="row" alignItems="center" spacing={0.75} flexWrap="wrap">
              <Box aria-hidden="true" sx={{ width: 10, height: 10, flexShrink: 0, borderRadius: "50%", bgcolor: STATUS_COLORS[status], border: `1px solid ${semanticTokens.app.border}` }} />
              <Typography component="h2" variant="h6" sx={{ color: semanticTokens.app.text, fontWeight: 900 }}>{statusLabel}</Typography>
            </Stack>
            <Typography sx={{ mt: 0.5, color: semanticTokens.app.textMuted, lineHeight: 1.5 }}>{t(`mcp.statusDescription.${status}`)}</Typography>
            <Typography sx={{ mt: 1, color: semanticTokens.app.textMuted, fontSize: "0.85rem", fontVariantNumeric: "tabular-nums" }}>
              {t("mcp.lastActivity", { time: formatMcpRelativeTime(lastActivityAt, now, t) })}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function SetupCard({ title, description, code, steps, copyLabel, copiedLabel, copied, disabled, onCopy }: {
  title: string;
  description: string;
  code: string;
  steps: string[];
  copyLabel: string;
  copiedLabel: string;
  copied: boolean;
  disabled: boolean;
  onCopy: () => void;
}) {
  return (
    <Card component="section" sx={{ minWidth: 0, borderRadius: WATCHLIST_RADIUS, bgcolor: semanticTokens.app.surfaceStrong, border: `2px solid ${semanticTokens.app.border}`, boxShadow: primitiveTokens.shadow.panel }}>
      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}>
        <Typography component="h2" variant="h6" sx={{ color: semanticTokens.app.text, fontWeight: 900 }}>{title}</Typography>
        <Typography sx={{ mt: 0.5, color: semanticTokens.app.textMuted, lineHeight: 1.5 }}>{description}</Typography>
        <Box component="pre" sx={{ mt: 1.5, mb: 1.25, p: 1.25, maxHeight: 220, overflow: "auto", borderRadius: WATCHLIST_RADIUS, bgcolor: semanticTokens.app.canvas, border: `1px solid ${semanticTokens.app.border}`, color: semanticTokens.app.text, fontFamily: primitiveTokens.font.numeric, fontSize: "0.77rem", lineHeight: 1.55, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {code}
        </Box>
        <Button
          type="button"
          variant="contained"
          onClick={onCopy}
          disabled={disabled}
          startIcon={copied ? <CheckIcon aria-hidden="true" /> : <ContentCopyIcon aria-hidden="true" />}
          sx={{ minHeight: 44, borderRadius: WATCHLIST_RADIUS, textTransform: "none", fontWeight: 800, "&:focus-visible": { outline: `3px solid ${semanticTokens.analysis.focus}`, outlineOffset: 2 } }}
        >
          {copied ? copiedLabel : copyLabel}
        </Button>
        <Stack component="ol" spacing={0.65} sx={{ mt: 1.5, mb: 0, pl: 2.5, color: semanticTokens.app.textMuted }}>
          {steps.map((step) => <Typography component="li" key={step} sx={{ lineHeight: 1.45 }}>{step}</Typography>)}
        </Stack>
      </CardContent>
    </Card>
  );
}

function ToolCatalog({ t }: { t: Translate }) {
  return (
    <Box component="section" aria-labelledby="mcp-tools-title">
      <Stack spacing={0.5} sx={{ mb: 1.25 }}>
        <Typography id="mcp-tools-title" component="h2" variant="h5" sx={{ color: semanticTokens.app.text, fontWeight: 900 }}>{t("mcp.tools.title")}</Typography>
        <Typography sx={{ color: semanticTokens.app.textMuted, lineHeight: 1.5 }}>{t("mcp.tools.description")}</Typography>
      </Stack>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: { xs: 1.5, sm: 2 } }}>
        {MCP_TOOL_GROUPS.map(({ id, tools }) => {
          const Icon = id === "read" ? SearchIcon : EditIcon;
          return (
          <Card component="section" key={id} aria-labelledby={`mcp-tools-${id}-title`} sx={{ minWidth: 0, borderRadius: WATCHLIST_RADIUS, bgcolor: semanticTokens.app.surfaceStrong, border: `2px solid ${semanticTokens.app.border}`, boxShadow: primitiveTokens.shadow.panel }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Icon aria-hidden="true" sx={{ color: semanticTokens.app.accent, mt: 0.25 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography id={`mcp-tools-${id}-title`} component="h3" variant="h6" sx={{ color: semanticTokens.app.text, fontWeight: 900 }}>{t(`mcp.tools.${id}.title`)}</Typography>
                  <Typography sx={{ color: semanticTokens.app.textMuted, fontSize: "0.84rem", lineHeight: 1.45 }}>{t(`mcp.tools.${id}.description`)}</Typography>
                  <Typography sx={{ mt: 0.4, color: semanticTokens.app.textMuted, fontSize: "0.8rem", fontVariantNumeric: "tabular-nums", fontWeight: 800 }}>{t(`mcp.tools.${id}.count`, { count: tools.length })}</Typography>
                </Box>
              </Stack>
              <Box component="ul" sx={{ display: "grid", gap: 0.8, m: 0, mt: 1.25, p: 0, listStyle: "none" }}>
                {tools.map((tool) => (
                  <Box component="li" key={tool} sx={{ minWidth: 0, p: 1, borderRadius: WATCHLIST_RADIUS, bgcolor: semanticTokens.app.canvas, border: `1px solid ${semanticTokens.app.border}` }}>
                    <Typography component="code" sx={{ display: "block", color: semanticTokens.app.text, fontFamily: primitiveTokens.font.numeric, fontSize: "0.78rem", fontWeight: 800, overflowWrap: "anywhere" }}>{tool}</Typography>
                    <Typography sx={{ mt: 0.35, color: semanticTokens.app.textMuted, fontSize: "0.82rem", lineHeight: 1.4 }}>{t(`mcp.tools.items.${tool}`)}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
          );
        })}
      </Box>
    </Box>
  );
}

export default function McpPage() {
  const { t } = useTranslation();
  const status = useMcpGatewayStore((state) => state.status);
  const config = useMcpGatewayStore((state) => state.config);
  const now = useRelativeClock();
  const [copyState, setCopyState] = useState<"idle" | "codex" | "generic" | "error">("idle");
  const resetCopyTimer = useRef<number | null>(null);
  const bridgePath = config?.available && config.bridgePath ? config.bridgePath : "";
  const codexConfig = useMemo(() => bridgePath ? buildCodexMcpConfig(bridgePath) : "", [bridgePath]);
  const genericConfig = useMemo(() => bridgePath ? buildGenericMcpConfig(bridgePath) : "", [bridgePath]);

  useEffect(() => () => {
    if (resetCopyTimer.current !== null) window.clearTimeout(resetCopyTimer.current);
  }, []);

  const copyConfig = async (kind: "codex" | "generic", value: string) => {
    if (!value) return;
    if (resetCopyTimer.current !== null) window.clearTimeout(resetCopyTimer.current);
    try {
      await writeText(value);
      setCopyState(kind);
      resetCopyTimer.current = window.setTimeout(() => setCopyState("idle"), 2_500);
    } catch {
      setCopyState("error");
    }
  };

  return (
    <Box component="section" aria-labelledby="mcp-page-title" data-testid="mcp-page" sx={{ boxSizing: "border-box", width: "100%", height: "100%", overflowX: "hidden", overflowY: "auto", bgcolor: semanticTokens.app.canvas, color: semanticTokens.app.text, p: { xs: 1.25, sm: 2, md: 3 }, pb: "calc(108px + env(safe-area-inset-bottom, 0px))", "@media (prefers-reduced-motion: reduce)": { scrollBehavior: "auto" } }}>
      <Stack spacing={{ xs: 1.5, sm: 2 }} sx={{ width: "100%", maxWidth: 820, mx: "auto" }}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          <HubIcon aria-hidden="true" sx={{ mt: 0.5, color: semanticTokens.app.accent }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ color: semanticTokens.app.textMuted, fontWeight: 800, letterSpacing: "0.08em" }}>{t("mcp.eyebrow")}</Typography>
            <Typography id="mcp-page-title" component="h1" variant="h4" sx={{ color: semanticTokens.app.text, fontWeight: 950, fontSize: { xs: "1.65rem", sm: "2rem" } }}>{t("mcp.title")}</Typography>
            <Typography sx={{ mt: 0.5, color: semanticTokens.app.textMuted, lineHeight: 1.55 }}>{t("mcp.subtitle")}</Typography>
          </Box>
        </Stack>

        <StatusCard status={status} lastActivityAt={config?.lastClientActivityAt ?? null} now={now} t={t} />

        <Card component="section" sx={{ borderRadius: WATCHLIST_RADIUS, bgcolor: semanticTokens.app.surfaceStrong, border: `2px solid ${semanticTokens.app.border}` }}>
          <CardContent sx={{ p: { xs: 1.5, sm: 2 }, "&:last-child": { pb: { xs: 1.5, sm: 2 } } }}>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <SecurityIcon aria-hidden="true" sx={{ color: semanticTokens.app.accent, mt: 0.25 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography component="h2" variant="h6" sx={{ fontWeight: 900 }}>{t("mcp.securityTitle")}</Typography>
                <Typography sx={{ mt: 0.5, color: semanticTokens.app.textMuted, lineHeight: 1.5 }}>{t("mcp.securityDescription")}</Typography>
              </Box>
            </Stack>
            {!bridgePath ? <Alert severity="info" sx={{ mt: 1.5, borderRadius: WATCHLIST_RADIUS }}>{t("mcp.desktopOnly")}</Alert> : null}
          </CardContent>
        </Card>

        <ToolCatalog t={t} />

        <Typography component="h2" variant="h5" sx={{ color: semanticTokens.app.text, fontWeight: 900 }}>{t("mcp.setupTitle")}</Typography>
        {copyState === "error" ? <Alert role="alert" severity="error" sx={{ borderRadius: WATCHLIST_RADIUS }}>{t("mcp.copyFailed")}</Alert> : null}
        {copyState === "codex" || copyState === "generic" ? <Alert role="status" severity="success" sx={{ borderRadius: WATCHLIST_RADIUS }}>{t("mcp.copied")}</Alert> : null}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: { xs: 1.5, sm: 2 } }}>
          <SetupCard
            title={t("mcp.codexTitle")}
            description={t("mcp.codexDescription")}
            code={codexConfig || t("mcp.configUnavailable")}
            copyLabel={t("mcp.copyConfig")}
            copiedLabel={t("mcp.copied")}
            copied={copyState === "codex"}
            disabled={!codexConfig}
            onCopy={() => { void copyConfig("codex", codexConfig); }}
            steps={[t("mcp.codexStepSave"), t("mcp.codexStepRestart"), t("mcp.codexStepVerify")]}
          />
          <SetupCard
            title={t("mcp.genericTitle")}
            description={t("mcp.genericDescription")}
            code={genericConfig || t("mcp.configUnavailable")}
            copyLabel={t("mcp.copyConfig")}
            copiedLabel={t("mcp.copied")}
            copied={copyState === "generic"}
            disabled={!genericConfig}
            onCopy={() => { void copyConfig("generic", genericConfig); }}
            steps={[t("mcp.genericStepPaste"), t("mcp.genericStepRestart"), t("mcp.genericStepVerify")]}
          />
        </Box>
      </Stack>
    </Box>
  );
}
