import { Button } from "@mui/material";
import { Outlet } from "react-router";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

function Home() {
  const openSecondaryWindow = async () => {
    const webview = new WebviewWindow("about", {
      url: "/about",
    });
    webview.once("tauri://created", function () {});
    webview.once("tauri://error", function (e) {
      console.log(e);
    });
  };

  return (
    <main>
      <Button variant="contained" size="small" onClick={openSecondaryWindow}>
        Open About
      </Button>
      <Outlet />
    </main>
  );
}
export default Home;
