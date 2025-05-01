import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { error } from "@tauri-apps/plugin-log";
import { useCallback } from "react";
export default function useSchoiceWebviewWindow() {
  const openSchoiceWindow = useCallback(async () => {
    let existingWindow = await WebviewWindow.getByLabel("schoice");

    if (existingWindow) {
      try {
        existingWindow.setFocus();
      } catch (e) {
        error(`Error focusing window: ${e}`);
      }
      return;
    } else {
      const webview = new WebviewWindow("schoice", {
        title: `Schoice 簡單選`,
        url: `/schoice`,
        maximized: true,
      });
      webview.once("tauri://created", function () {});
      webview.once("tauri://error", function (e) {
        error(`Error creating window: ${e}`);
      });
    }
  }, []);

  return { openSchoiceWindow };
}
