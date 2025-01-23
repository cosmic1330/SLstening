import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useCallback } from "react";
export default function useSchoiceWebviewWindow() {
  const openSchoiceWindow = useCallback(async () => {
    let existingWindow = await WebviewWindow.getByLabel("schoice");

    if (existingWindow) {
      try {
        existingWindow.setFocus();
      } catch (error) {
        console.error("Error interacting with existing window:", error);
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
        console.log(e);
      });
    }
  }, []);

  return { openSchoiceWindow };
}
