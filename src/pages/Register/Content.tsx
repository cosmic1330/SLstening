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

// Animation Variants
const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20, rotate: 1 },
  visible: {
    opacity: 1,
    y: 0,
    rotate: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// Ghibli Parchment Paper Card
const GhibliPaperCard = styled(motion.div)(({ theme }) => ({
  background: "#FAF3E0",
  backgroundImage:
    "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.2) 0%, transparent 100%)",
  borderRadius: "24px",
  border: "2px solid #5D4037",
  boxShadow: `
    0 10px 30px rgba(0, 0, 0, 0.2),
    inset 0 0 60px rgba(139, 115, 85, 0.1)
  `,
  padding: theme.spacing(5),
  width: "100%",
  maxWidth: "420px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  position: "relative",
  zIndex: 2,

  // 封蠟裝飾
  "&::before": {
    content: '""',
    position: "absolute",
    top: "-25px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "50px",
    height: "50px",
    background: "#B22222",
    borderRadius: "50%",
    boxShadow: "0 4px 10px rgba(0,0,0,0.3), inset 0 0 10px rgba(0,0,0,0.2)",
    border: "4px solid #A52A2A",
    zIndex: 3,
  },

  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(4),
    maxWidth: "92%",
  },
}));

// Hand-drawn TextField
const HanddrawnTextField = styled(TextField)(() => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    transition: "all 0.3s ease",
    "& fieldset": {
      borderColor: "#8B7355",
      borderWidth: "1.5px",
    },
    "&:hover fieldset": {
      borderColor: "#5D4037",
    },
    "&.Mui-focused fieldset": {
      borderColor: "#3D5A45",
      borderWidth: "2px",
    },
    "&.Mui-focused": {
      backgroundColor: "white",
    },
  },
  "& .MuiInputLabel-root": {
    color: "#8B7355",
    fontWeight: 600,
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "#3D5A45",
  },
  "& input": {
    padding: "12px 16px",
    color: "#5D4037",
    fontWeight: 600,
  },
}));

const ForestButton = styled(motion.button)(() => ({
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "2px solid #2D4A35",
  background: "#3D5A45",
  color: "#F1E5AC",
  fontWeight: 800,
  fontSize: "1rem",
  cursor: "pointer",
  boxShadow: "0 4px 0 #2D4A35",
  transition: "all 0.1s ease",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  "&:disabled": {
    background: "#A8B5AA",
    border: "2px solid #8A968C",
    boxShadow: "none",
    color: "#E0E0E0",
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
              background: "#F1E5AC",
              border: "2px solid #5D4037",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
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
            sx={{ color: "#5D4037", letterSpacing: "-0.5px", mb: 0.5 }}
          >
            {t("Pages.Register.register")}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "#8B7355", fontWeight: 700, fontStyle: "italic" }}
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
              backgroundColor: "#FFF1EB",
              color: "#A52A2A",
              border: "1px solid #A52A2A",
              fontWeight: 700,
              "& .MuiAlert-icon": { color: "#A52A2A" },
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
            <Divider sx={{ width: "100%", borderColor: "#D2B48C", mb: 2 }} />
            <Typography
              variant="body2"
              sx={{
                color: "#5D4037",
                fontWeight: 800,
                cursor: "pointer",
                textDecoration: "underline",
                "&:hover": { color: "#3D5A45" },
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
