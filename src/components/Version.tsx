import { Stack, Typography } from "@mui/material";
import { getVersion } from "@tauri-apps/api/app";
import { useEffect, useState } from "react";
import { reportHandledError } from "../diagnostics";


export default function Version() {
  const [tauriVersion, setTauriVersion] = useState<string | null>(null);

  useEffect(() => {
    getVersion().then(setTauriVersion).catch((error) => {
      reportHandledError("app_version_read", error, "APP_VERSION_READ_FAILED");
    });
  }, []);

  return (
    <Stack
      justifyContent="space-between"
      direction="row"
      alignItems="center"
      sx={{ position: "fixed", bottom: "5px", right:"10px",  color: "white" }}
      spacing={1}
    >
        <Typography variant="caption">v{tauriVersion}</Typography>
    </Stack>
  );
}
