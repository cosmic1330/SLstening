import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { error, info } from "@tauri-apps/plugin-log";
import { useCallback } from "react";
export default function useAddWebviewWindow() {
  const openAddWindow = useCallback(async () => {
    const appWindow = getCurrentWindow();
    let existingWindow = await WebviewWindow.getByLabel("add");
    if (existingWindow) {
      try {
        existingWindow.setFocus();
      } catch (e) {
        error(`Error focusing window: ${e}`);
      }
      return;
    } else {
      const webview = new WebviewWindow("add", {
        title: "Add Stock Id",
        url: "/add",
        width: 300,
        height: 300,
        parent: appWindow,
      });
      webview.once("tauri://created", function () {});
      webview.once("tauri://error", function (e) {
        info(`Error creating window: ${e}`);
      });
    }
  }, []);

  return { openAddWindow };
}
