import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback } from "react";
export default function useSchoiceWebviewWindow() {
  
  const openSchoiceWindow =  useCallback(async () => {
    const appWindow = getCurrentWindow();
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
        parent: appWindow,
        resizable: true,
        maximized: true
      });
      webview.once("tauri://created", function () {});
      webview.once("tauri://error", function (e) {
        console.log(e);
      });
    }
  },[]);

  return { openSchoiceWindow };
}
