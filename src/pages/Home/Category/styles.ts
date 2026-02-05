import { Box, Chip, TextField, styled } from "@mui/material";

export const PageContainer = styled(Box)(() => ({
  width: "100%",
  minHeight: "100vh",
  overflowY: "auto",
  overflowX: "hidden",
  position: "relative",
  backgroundColor: "#020617",
  backgroundImage:
    "radial-gradient(at 0% 0%, hsla(160, 84%, 17%, 1) 0, transparent 50%), " +
    "radial-gradient(at 100% 100%, hsla(220, 40%, 10%, 1) 0, transparent 50%)",
  color: "white",
}));

export const PremiumHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(4, 4, 3, 4),
  zIndex: 10,
}));

export const CategoryPill = styled(Chip, {
  shouldForwardProp: (prop) => prop !== "active",
})<{ active?: boolean }>(({ active }) => ({
  height: "36px",
  borderRadius: "18px",
  padding: "0 8px",
  fontSize: "0.9rem",
  fontWeight: active ? 700 : 500,
  background: active ? "rgba(255, 255, 255, 0.9)" : "rgba(255, 255, 255, 0.03)",
  color: active ? "#020617" : "rgba(255, 255, 255, 0.6)",
  border: "1px solid",
  borderColor: active ? "transparent" : "rgba(255, 255, 255, 0.1)",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    background: active ? "white" : "rgba(255, 255, 255, 0.08)",
    transform: "translateY(-1px)",
  },
}));

export const CommandSearchBox = styled(Box)(({ theme }) => ({
  maxWidth: "600px",
  width: "calc(100% - 64px)",
  margin: "0 auto",
  marginBottom: theme.spacing(3),
  zIndex: 100,
}));

export const CommandInput = styled(TextField)(() => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: "16px",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(20px)",
    fontSize: "1rem",
    color: "white", // Ensure input text is white
    "& fieldset": { borderColor: "rgba(255, 255, 255, 0.1)" },
    "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
    "&.Mui-focused fieldset": { borderColor: "#10b981", borderWidth: "2px" },
  },
  "& .MuiInputLabel-root": {
    color: "rgba(255, 255, 255, 0.5)",
    "&.Mui-focused": { color: "#10b981" },
  },
  "& .MuiInputBase-input::placeholder": {
    color: "rgba(255, 255, 255, 0.3)",
    opacity: 1,
  },
  "& input": { color: "white", padding: "12px 16px" },
}));
