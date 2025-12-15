import {
  Box,
  Button,
  Checkbox,
  Stack,
  TextField,
  Typography,
  styled,
  alpha,
  Divider,
  Alert,
  Collapse,
} from "@mui/material";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { error } from "@tauri-apps/plugin-log";
import { useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../supabase";
import translateError from "../../utils/translateError";
import { useTranslation } from "react-i18next";
import GoogleOauthButton from "../../components/GoogleOauthButton";

// Glassmorphism Card Component
const GlassCard = styled(Box)(({ theme }) => ({
  background: "rgba(30, 30, 40, 0.6)", // Semi-transparent dark background
  backdropFilter: "blur(16px)", // Strong blur effect
  WebkitBackdropFilter: "blur(16px)",
  borderRadius: "24px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.3)",
  padding: theme.spacing(6),
  width: "100%",
  maxWidth: "420px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: theme.spacing(3),
  transition: "transform 0.2s ease-in-out",
  
  // RWD adjustments
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(3),
    borderRadius: "16px",
    maxWidth: "90%",
    gap: theme.spacing(2),
  },

  "&:hover": {
    boxShadow: "0 12px 40px 0 rgba(0, 0, 30, 0.4)",
  },
}));

// Custom Styled TextField
const CustomTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    backgroundColor: alpha(theme.palette.common.white, 0.03),
    transition: "all 0.2s ease",
    "& fieldset": {
      borderColor: "rgba(255, 255, 255, 0.1)",
    },
    "&:hover fieldset": {
      borderColor: "rgba(255, 255, 255, 0.2)",
    },
    "&.Mui-focused fieldset": {
      borderColor: theme.palette.primary.main,
      borderWidth: "1px",
    },
    "&.Mui-focused": {
      backgroundColor: alpha(theme.palette.common.white, 0.05),
      transform: "translateY(-1px)",
    },
    // Smaller input on small screens
    [theme.breakpoints.down("sm")]: {
        "& input": {
            padding: "10px 14px", 
        }
    }
  },
  "& .MuiInputLabel-root": {
    color: alpha(theme.palette.common.white, 0.6),
    [theme.breakpoints.down("sm")]: {
        fontSize: "0.875rem",
        transform: "translate(14px, 12px) scale(1)",
        "&.MuiInputLabel-shrink": {
             transform: "translate(14px, -9px) scale(0.75)",
        }
    },
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: theme.palette.primary.main,
  },
  "& input": {
    color: theme.palette.common.white,
  },
}));

const Content = () => {
  const { t } = useTranslation();
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(
    localStorage.getItem("slitenting-email") || ""
  );
  const [password, setPassword] = useState(
    localStorage.getItem("slitenting-password") || ""
  );
  const [remember, setRemember] = useState(true);
  let navigate = useNavigate();

  const signIn = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(translateError(error.message));
      } else {
        if (remember) {
          localStorage.setItem("slitenting-email", email);
          localStorage.setItem("slitenting-password", password);
        } else {
          localStorage.removeItem("slitenting-email");
          localStorage.removeItem("slitenting-password");
        }
        const alwaysOnTop =
          localStorage.getItem("slitenting-alwaysOnTop") === "true";
        getCurrentWindow().setAlwaysOnTop(alwaysOnTop);
        navigate("/dashboard");
      }
    } catch (e) {
      error(`Error signing in: ${e}`);
    }
    setLoading(false);
  };

  const register = async () => {
    navigate("/register");
  };

  return (
    <GlassCard>
      <Box mb={1} textAlign="center">
         {/* Logo placeholder - using text if image not ideal, but keeping image for now */}
         <img 
            src="icon.png" 
            alt="logo" 
            style={{ 
              width: "80px", 
              marginBottom: "8px", 
              filter: "drop-shadow(0 0 10px rgba(255,255,255,0.2))" 
            }} 
         />
         <Typography variant="h5" fontWeight="700" color="white" gutterBottom>
           {t("Pages.Login.welcomeBack")}
         </Typography>
         <Typography variant="body2" color="rgba(255,255,255,0.5)">
           {t("Pages.Login.enterCredentials")}
         </Typography>
      </Box>

      <Box width="100%" component="form" onSubmit={(e) => { e.preventDefault(); signIn(); }}>
        <Collapse in={!!errorMsg}>
           <Alert 
             severity="error" 
             sx={{ 
               mb: 2, 
               borderRadius: "12px",
               backgroundColor: "rgba(211, 47, 47, 0.15)", // Transparent red
               color: "#ffcdd2",
               border: "1px solid rgba(239, 83, 80, 0.3)",
               "& .MuiAlert-icon": {
                 color: "#ef5350" // Light red icon
               }
             }}
             onClose={() => setErrorMsg("")}
           >
             {errorMsg}
           </Alert>
        </Collapse>

        <Stack spacing={2.5}>
          <CustomTextField
            fullWidth
            label={t("Pages.Login.email")}
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            variant="outlined"
          />
          <CustomTextField
            fullWidth
            label={t("Pages.Login.password")}
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            variant="outlined"
          />
        </Stack>

        <Stack 
          direction="row" 
          alignItems="center" 
          justifyContent="space-between" 
          mt={1.5} 
          mb={3}
        >
          <Stack direction="row" alignItems="center">
            <Checkbox
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              size="small"
              sx={{
                color: "rgba(255,255,255,0.4)",
                "&.Mui-checked": {
                  color: "primary.main",
                },
              }}
            />
            <Typography variant="caption" color="rgba(255,255,255,0.6)">
              {t("Pages.Login.rememberMe")}
            </Typography>
          </Stack>
          {/* Optional: Forgot Password Link could go here */}
        </Stack>

        <Button
          type="submit"
          onClick={signIn}
          disabled={loading || !email || !password}
          fullWidth
          size="large"
          variant="contained"
          sx={{
            borderRadius: "12px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            textTransform: "none",
            fontWeight: 600,
            fontSize: "1rem",
            boxShadow: "0 4px 15px rgba(100, 100, 255, 0.3)",
            "&:hover": {
              background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
              boxShadow: "0 6px 20px rgba(100, 100, 255, 0.4)",
            }
          }}
        >
          {loading ? t("Pages.Login.signingIn") : t("Pages.Login.signIn")}
        </Button>

        <Box my={2} display="flex" alignItems="center">
            <Divider sx={{ flex: 1, borderColor: "rgba(255,255,255,0.1)" }} />
            <Typography variant="caption" color="rgba(255,255,255,0.4)" mx={2}>
                {t("Pages.Login.or")}
            </Typography>
            <Divider sx={{ flex: 1, borderColor: "rgba(255,255,255,0.1)" }} />
        </Box>

        <Stack spacing={1}>
           <GoogleOauthButton onLogin={() => navigate("/dashboard")} />
           
           <Button
            onClick={register}
            disabled={loading}
            fullWidth
            size="medium"
            sx={{
              color: "rgba(255,255,255,0.7)",
              textTransform: "none",
              "&:hover": {
                color: "white",
                background: "rgba(255,255,255,0.05)"
              }
            }}
          >
            {t("Pages.Login.register")}
          </Button>
        </Stack>
      </Box>
    </GlassCard>
  );
};

export default Content;
