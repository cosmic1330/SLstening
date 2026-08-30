import GoogleIcon from "@mui/icons-material/Google";
import { Button } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { startGoogleOAuth } from "../auth/service";
import { supabase } from "../supabase";

export default function GoogleOauthButton({
  onError,
}: {
  onError?: (message: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await startGoogleOAuth(supabase);

    if (error) {
      onError?.(error.message);
      setLoading(false);
    }
  };

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
