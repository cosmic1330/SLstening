import { Box, Chip, TextField, styled } from "@mui/material";

export const PageContainer = styled(Box)(() => ({
  width: "100%",
  height: "100vh",
  overflow: "hidden",
  position: "relative",
  background: "#FDF8F2", // 溫馨暖米白
  backgroundImage: "radial-gradient(at 0% 0%, rgba(61, 90, 69, 0.05) 0, transparent 50%), radial-gradient(at 100% 100%, rgba(210, 105, 30, 0.05) 0, transparent 50%)",
  color: "#5D4037", // 深木棕
}));

export const PremiumHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(4, 4, 2, 4),
  zIndex: 10,
}));

export const CategoryPill = styled(Chip, {
  shouldForwardProp: (prop) => prop !== "active",
})<{ active?: boolean }>(({ active }) => ({
  height: "34px",
  borderRadius: "12px",
  padding: "0 6px",
  fontSize: "0.85rem",
  fontWeight: 800,
  background: active ? "#3D5A45" : "rgba(93, 64, 55, 0.05)",
  color: active ? "#F1E5AC" : "#8B7355",
  border: "2px solid",
  borderColor: active ? "#2D4A35" : "rgba(93, 64, 55, 0.1)",
  boxShadow: active ? "0 4px 0 #2D4A35" : "none",
  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    background: active ? "#3D5A45" : "rgba(93, 64, 55, 0.1)",
    transform: "translateY(-1px)",
  },
}));

export const CommandSearchBox = styled(Box)(({ theme }) => ({
  maxWidth: "500px",
  width: "calc(100% - 32px)",
  margin: "0 auto",
  marginBottom: theme.spacing(2),
  zIndex: 100,
}));

export const CommandInput = styled(TextField)(() => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    backgroundColor: "#FCF9F5",
    fontSize: "0.95rem",
    color: "#5D4037",
    "& fieldset": { 
      borderColor: "#D2B48C",
      borderWidth: "1.5px"
    },
    "&:hover fieldset": { borderColor: "#8B7355" },
    "&.Mui-focused fieldset": { borderColor: "#3D5A45", borderWidth: "2px" },
  },
  "& .MuiInputLabel-root": {
    color: "#8B7355",
    fontWeight: 600,
    "&.Mui-focused": { color: "#3D5A45" },
  },
  "& .MuiInputBase-input::placeholder": {
    color: "#D2B48C",
    opacity: 1,
    fontStyle: "italic"
  },
  "& input": { color: "#5D4037", padding: "12px 16px", fontWeight: 700 },
}));
