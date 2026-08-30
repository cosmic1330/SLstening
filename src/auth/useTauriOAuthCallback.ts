import { useEffect } from "react";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { isTauriDesktop } from "./service";

export function useTauriOAuthCallback(onUrl: (url: string) => void) {
  useEffect(() => {
    if (!isTauriDesktop()) return;

    let disposed = false;
    let unlisten: (() => void) | undefined;
    const deliver = (urls: string[]) => {
      if (!disposed) urls.forEach(onUrl);
    };

    void (async () => {
      try {
        deliver((await getCurrent()) ?? []);
        unlisten = await onOpenUrl(deliver);
      } catch {
        // The app remains usable if a platform does not expose deep links.
      }
    })();

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [onUrl]);
}
