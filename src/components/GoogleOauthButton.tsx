import GoogleIcon from "@mui/icons-material/Google";
import { Button } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { openUrl } from "@tauri-apps/plugin-opener";
import { authErrorKey } from "../auth/errors";
import { startGoogleOAuth } from "../auth/service";
import { supabase } from "../supabase";

export default function GoogleOauthButton({
  onError,
  callbackStatus,
}: {
  onError?: (key: string) => void;
  callbackStatus?: "idle" | "processing" | "error";
}) {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await startGoogleOAuth(supabase);
      if (error) throw error;
      if ("__TAURI_INTERNALS__" in window) {
        if (!data.url) {
          onError?.("oauthFailed");
          setLoading(false);
          return;
        }
        await openUrl(data.url);
      }
    } catch (error) {
      onError?.(authErrorKey(error));
      setLoading(false);
    }
  };

  useEffect(() => {
    if (callbackStatus === "error") setLoading(false);
  }, [callbackStatus]);

  return (
    <Button
      fullWidth
      variant="contained"
      color="success"
      onClick={handleLogin}
      disabled={loading}
    >
      <GoogleIcon style={{ marginRight: 8 }} />
      {loading ? t("Pages.Login.googleSigningIn") : t("Pages.Login.googleSignIn")}
    </Button>
  );
}
