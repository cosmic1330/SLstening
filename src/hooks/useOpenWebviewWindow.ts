import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback } from "react";
export default function useOpenWebviewWindow() {
  const openAddWindow = useCallback(async () => {
    const appWindow = getCurrentWindow();
    let existingWindow = await WebviewWindow.getByLabel("add");
    if (existingWindow) {
      try {
        existingWindow.setFocus();
      } catch (error) {
        console.error("Error interacting with existing window:", error);
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
        console.log(e);
      });
    }
  }, []);

  return {openAddWindow};
}
