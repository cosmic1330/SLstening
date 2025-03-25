import { Box } from "@mui/material";
import { getVersion } from "@tauri-apps/api/app";
import { useEffect, useState } from "react";

export default function Version() {
  const [tauriVersion, setTauriVersion] = useState<string | null>(null);

  useEffect(() => {
    getVersion().then(setTauriVersion).catch(console.error);
  }, []);

  return (
    <Box
      sx={{ position: "fixed", bottom: "5px", right: "10px", color: "white" }}
    >
      v{tauriVersion}
    </Box>
  );
}
