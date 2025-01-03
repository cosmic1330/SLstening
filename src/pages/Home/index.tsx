import { Button, Container } from "@mui/material";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Outlet } from "react-router";

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
    <Container component="main" >
      <Button variant="contained" size="small" onClick={openSecondaryWindow}>
        Open About
      </Button>
      <Outlet />
    </Container>
  );
}
export default Home;
