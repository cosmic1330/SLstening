import {
  Alert,
  Box,
  Button,
  Checkbox,
  Collapse,
  Divider,
  Stack,
  styled,
  TextField,
  Typography,
} from "@mui/material";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { error } from "@tauri-apps/plugin-log";
import { motion, Variants } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import GoogleOauthButton from "../../components/GoogleOauthButton";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { supabase } from "../../supabase";
import translateError from "../../utils/translateError";
import { primitiveTokens, semanticTokens } from "../../theme";

// Animation Variants
const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20, rotate: -1 },
  visible: {
    opacity: 1,
    y: 0,
    rotate: 0,
    transition: {
      duration: primitiveTokens.motion.duration.deliberate / 1000,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: primitiveTokens.motion.duration.fast / 2500,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// Ghibli Parchment Paper Card
const GhibliPaperCard = styled(motion.div)(({ theme }) => ({
  background: semanticTokens.auth.surface, // 古紙色
  backgroundImage: semanticTokens.auth.paperHighlight,
  borderRadius: primitiveTokens.radius.xl + primitiveTokens.spacing.xs,
  border: `2px solid ${semanticTokens.auth.text}`, // 深木棕
  boxShadow: primitiveTokens.shadow.authCard,
  padding: theme.spacing(6),
  width: "100%",
  maxWidth: "420px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  position: "relative",
  zIndex: primitiveTokens.layer.raised,

  // 封蠟裝飾 (Wax Seal Shorthand)
  "&::before": {
    content: '""',
    position: "absolute",
    top: "-25px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "50px",
    height: "50px",
    background: semanticTokens.auth.wax, // 火漆紅
    borderRadius: "50%",
    boxShadow: primitiveTokens.shadow.authSeal,
    border: `4px solid ${semanticTokens.auth.waxBorder}`,
    zIndex: primitiveTokens.layer.raised + 1,
  },

  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(4),
    maxWidth: "90%",
  },
}));

// Hand-drawn TextField
const HanddrawnTextField = styled(TextField)(() => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: primitiveTokens.radius.sm,
    backgroundColor: semanticTokens.auth.field,
    transition: [
      `background-color ${primitiveTokens.motion.duration.standard}ms ${primitiveTokens.motion.easing.standard}`,
      `border-color ${primitiveTokens.motion.duration.standard}ms ${primitiveTokens.motion.easing.standard}`,
    ].join(", "),
    "& fieldset": {
      borderColor: semanticTokens.auth.textMuted, // 暖土棕
      borderWidth: "1.5px",
    },
    "&:hover fieldset": {
      borderColor: semanticTokens.auth.text,
    },
    "&.Mui-focused fieldset": {
      borderColor: semanticTokens.auth.primary, // 林綠
      borderWidth: "2px",
    },
    "&.Mui-focused": {
      backgroundColor: semanticTokens.auth.fieldFocus,
    },
  },
  "& .MuiInputLabel-root": {
    color: semanticTokens.auth.textMuted,
    fontWeight: 600,
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: semanticTokens.auth.primary,
  },
  "& input": {
    padding: "14px 16px",
    color: semanticTokens.auth.text,
    fontWeight: 600,
  },
}));

const ForestButton = styled(motion.button)(() => ({
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  border: `2px solid ${semanticTokens.auth.primaryStrong}`,
  background: semanticTokens.auth.primary,
  color: semanticTokens.auth.onPrimary, // 暖奶油黃字
  fontWeight: 800,
  fontSize: "1rem",
  cursor: "pointer",
  boxShadow: `0 4px 0 ${semanticTokens.auth.primaryStrong}`,
  transition: [
    `transform ${primitiveTokens.motion.duration.fast}ms ${primitiveTokens.motion.easing.standard}`,
    `box-shadow ${primitiveTokens.motion.duration.fast}ms ${primitiveTokens.motion.easing.standard}`,
  ].join(", "),
  "@media (prefers-reduced-motion: reduce)": { transition: "none" },
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  "&:disabled": {
    background: semanticTokens.auth.disabledSurface,
    border: `2px solid ${semanticTokens.auth.disabledBorder}`,
    boxShadow: "none",
    color: semanticTokens.auth.disabledText,
  },
}));

const Content = () => {
  const { t } = useTranslation();
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(
    localStorage.getItem("slitenting-email") || "",
  );
  const [password, setPassword] = useState(
    localStorage.getItem("slitenting-password") || "",
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
    <GhibliPaperCard
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <Box sx={{ position: "absolute", top: 20, right: 20 }}>
        <LanguageSwitcher />
      </Box>

      <motion.div variants={itemVariants}>
        <Box mb={4} textAlign="center">
          <Box
            sx={{
              width: "64px",
              height: "64px",
              margin: "0 auto 12px",
              borderRadius: "50%",
              background: semanticTokens.auth.onPrimary,
              border: `2px solid ${semanticTokens.auth.text}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: primitiveTokens.shadow.authLogo,
            }}
          >
            <img
              src="icon.png"
              alt="logo"
              style={{
                width: "42px",
                height: "42px",
              }}
            />
          </Box>
          <Typography
            variant="h5"
            fontWeight="900"
            sx={{ color: semanticTokens.auth.text, letterSpacing: "-0.5px", mb: 0.5 }}
          >
            {t("Pages.Login.welcomeBack")}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: semanticTokens.auth.textMuted, fontWeight: 700, fontStyle: "italic" }}
          >
            {t("Pages.Login.enterCredentials")}
          </Typography>
        </Box>
      </motion.div>

      <Box
        width="100%"
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          signIn();
        }}
      >
        <Collapse in={!!errorMsg}>
          <Alert
            severity="error"
            sx={{
              mb: 2,
              borderRadius: "12px",
              backgroundColor: semanticTokens.auth.dangerSurface,
              color: semanticTokens.auth.danger,
              border: `1px solid ${semanticTokens.auth.danger}`,
              fontWeight: 700,
              "& .MuiAlert-icon": { color: semanticTokens.auth.danger },
            }}
            onClose={() => setErrorMsg("")}
          >
            {errorMsg}
          </Alert>
        </Collapse>

        <Stack spacing={2.5}>
          <motion.div variants={itemVariants}>
            <HanddrawnTextField
              fullWidth
              label={t("Pages.Login.email")}
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              variant="outlined"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <HanddrawnTextField
              fullWidth
              label={t("Pages.Login.password")}
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              variant="outlined"
            />
          </motion.div>
        </Stack>

        <motion.div variants={itemVariants}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            mt={2}
            mb={3}
          >
            <Stack
              direction="row"
              alignItems="center"
              sx={{ cursor: "pointer" }}
              onClick={() => setRemember(!remember)}
            >
              <Checkbox
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                size="small"
                sx={{
                  padding: 0,
                  marginRight: 1,
                  color: semanticTokens.auth.textMuted,
                  "&.Mui-checked": {
                    color: semanticTokens.auth.primary,
                  },
                }}
              />
              <Typography
                variant="body2"
                sx={{ color: semanticTokens.auth.textMuted, fontWeight: 700, userSelect: "none" }}
              >
                {t("Pages.Login.rememberMe")}
              </Typography>
            </Stack>
          </Stack>
        </motion.div>

        <motion.div variants={itemVariants}>
          <ForestButton
            type="submit"
            disabled={loading || !email || !password}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98, translateY: 2 }}
          >
            {loading ? t("Pages.Login.signingIn") : t("Pages.Login.signIn")}
          </ForestButton>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Box my={3.5} display="flex" alignItems="center">
            <Divider sx={{ flex: 1, borderColor: semanticTokens.auth.border }} />
            <Typography
              variant="caption"
              sx={{ color: semanticTokens.auth.textMuted, mx: 2, fontWeight: 900 }}
            >
              {t("Pages.Login.or").toUpperCase()}
            </Typography>
            <Divider sx={{ flex: 1, borderColor: semanticTokens.auth.border }} />
          </Box>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Stack spacing={2}>
            <GoogleOauthButton onLogin={() => navigate("/dashboard")} />

            <Button
              onClick={register}
              disabled={loading}
              fullWidth
              sx={{
                py: 1,
                color: semanticTokens.auth.text,
                borderRadius: "12px",
                fontWeight: 800,
                textDecoration: "underline",
                "&:hover": {
                  background: semanticTokens.auth.surfaceTint,
                },
              }}
            >
              {t("Pages.Login.register")}
            </Button>
          </Stack>
        </motion.div>
      </Box>
    </GhibliPaperCard>
  );
};

export default Content;
