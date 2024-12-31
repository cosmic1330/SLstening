import { Button } from "@mui/material";
import { getCurrentWindow } from "@tauri-apps/api/window";

function About() {
  const closeWindow = async () => {
    const webview = getCurrentWindow();
    console.log(webview);
    webview.close();
  };

  return (
    <div>
      <Button variant="contained" size="small" onClick={closeWindow}>
        Close
      </Button>
      About
    </div>
  );
}
export default About;
