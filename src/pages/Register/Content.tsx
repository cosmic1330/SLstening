import {
  Alert,
  Box,
  Collapse,
  Divider,
  Stack,
  styled,
  TextField,
  Typography,
} from "@mui/material";
import { error } from "@tauri-apps/plugin-log";
import { motion, Variants } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { supabase } from "../../supabase";
import translateError from "../../utils/translateError";
import { primitiveTokens, semanticTokens } from "../../theme";

// Animation Variants
const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20, rotate: 1 },
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
  background: semanticTokens.auth.surface,
  backgroundImage: semanticTokens.auth.paperHighlight,
  borderRadius: primitiveTokens.radius.xl + primitiveTokens.spacing.xs,
  border: `2px solid ${semanticTokens.auth.text}`,
  boxShadow: primitiveTokens.shadow.authCard,
  padding: theme.spacing(5),
  width: "100%",
  maxWidth: "420px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  position: "relative",
  zIndex: primitiveTokens.layer.raised,

  // 封蠟裝飾
  "&::before": {
    content: '""',
    position: "absolute",
    top: "-25px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "50px",
    height: "50px",
    background: semanticTokens.auth.wax,
    borderRadius: "50%",
    boxShadow: primitiveTokens.shadow.authSeal,
    border: `4px solid ${semanticTokens.auth.waxBorder}`,
    zIndex: primitiveTokens.layer.raised + 1,
  },

  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(4),
    maxWidth: "92%",
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
      borderColor: semanticTokens.auth.textMuted,
      borderWidth: "1.5px",
    },
    "&:hover fieldset": {
      borderColor: semanticTokens.auth.text,
    },
    "&.Mui-focused fieldset": {
      borderColor: semanticTokens.auth.primary,
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
    padding: "12px 16px",
    color: semanticTokens.auth.text,
    fontWeight: 600,
  },
}));

const ForestButton = styled(motion.button)(() => ({
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: `2px solid ${semanticTokens.auth.primaryStrong}`,
  background: semanticTokens.auth.primary,
  color: semanticTokens.auth.onPrimary,
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

function Content() {
  const { t } = useTranslation();
  const [errorMsg, setErrorMsg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  let navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  const signUp = async () => {
    if (password !== confirmPassword) {
      setErrorMsg(
        t("Pages.Register.passwordMismatch") || "Passwords do not match!",
      );
      return;
    }
    setErrorMsg("");
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setErrorMsg(translateError(signUpError.message));
      } else {
        alert("Registration Successful!");
        navigate("/");
      }
    } catch (e) {
      error(`Error signing up: ${e}`);
    }
    setLoading(false);
  };

  return (
    <GhibliPaperCard
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants}>
        <Box mb={3} textAlign="center">
          <Box
            sx={{
              width: "56px",
              height: "56px",
              margin: "0 auto 12px",
              borderRadius: "50%",
              background: semanticTokens.auth.onPrimary,
              border: `2px solid ${semanticTokens.auth.text}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: primitiveTokens.shadow.authLogoCompact,
            }}
          >
            <img
              src="icon.png"
              alt="logo"
              style={{
                width: "36px",
                height: "36px",
              }}
            />
          </Box>
          <Typography
            variant="h5"
            fontWeight="900"
            sx={{ color: semanticTokens.auth.text, letterSpacing: "-0.5px", mb: 0.5 }}
          >
            {t("Pages.Register.register")}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: semanticTokens.auth.textMuted, fontWeight: 700, fontStyle: "italic" }}
          >
            {t("Pages.Register.enterCredentials") || "Create your account"}
          </Typography>
        </Box>
      </motion.div>

      <Box width="100%" component="form" onSubmit={handleSubmit}>
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

        <Stack spacing={1.5}>
          <motion.div variants={itemVariants}>
            <HanddrawnTextField
              fullWidth
              label={t("Pages.Register.email")}
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
              label={t("Pages.Register.password")}
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              variant="outlined"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <HanddrawnTextField
              fullWidth
              label={t("Pages.Register.confirmPassword")}
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              variant="outlined"
            />
          </motion.div>
        </Stack>

        <Box mt={3}>
          <motion.div variants={itemVariants}>
            <ForestButton
              type="submit"
              onClick={signUp}
              disabled={loading || !email || !password || !confirmPassword}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98, translateY: 2 }}
            >
              {loading
                ? t("Pages.Register.registering") || "Processing..."
                : t("Pages.Register.register")}
            </ForestButton>
          </motion.div>
        </Box>

        <motion.div variants={itemVariants}>
          <Box mt={3} display="flex" flexDirection="column" alignItems="center">
            <Divider sx={{ width: "100%", borderColor: semanticTokens.auth.border, mb: 2 }} />
            <Typography
              variant="body2"
              sx={{
                color: semanticTokens.auth.text,
                fontWeight: 800,
                cursor: "pointer",
                textDecoration: "underline",
                "&:hover": { color: semanticTokens.auth.primary },
              }}
              onClick={() => navigate("/")}
            >
              {t("Pages.Register.haveAccount")}
            </Typography>
          </Box>
        </motion.div>
      </Box>
    </GhibliPaperCard>
  );
}

export default Content;
