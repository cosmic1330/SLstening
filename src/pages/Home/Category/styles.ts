import { Box, Chip, TextField, styled } from "@mui/material";
import { primitiveTokens, semanticTokens } from "../../../theme";

export const PageContainer = styled(Box)(() => ({
  width: "100%",
  height: "100%",
  overflow: "hidden",
  position: "relative",
  background: semanticTokens.app.canvas, // 溫馨暖米白
  backgroundImage: semanticTokens.app.canvasDecoration,
  color: semanticTokens.app.text, // 深木棕
}));

export const PremiumHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2, 2, 2, 2),
  zIndex: primitiveTokens.layer.raised,
}));

export const CategoryPill = styled(Chip, {
  shouldForwardProp: (prop) => prop !== "active",
})<{ active?: boolean }>(({ active }) => ({
  height: "36px",
  borderRadius: primitiveTokens.radius.pill,
  padding: "0 6px",
  fontSize: "0.9rem",
  fontWeight: 800,
  background: active ? semanticTokens.app.primary : semanticTokens.app.surfaceTint,
  color: active ? semanticTokens.app.onPrimary : semanticTokens.app.textMuted,
  border: "2px solid",
  borderColor: active ? semanticTokens.app.primaryStrong : semanticTokens.app.surfaceTintHover,
  boxShadow: active ? `0 4px 0 ${semanticTokens.app.primaryStrong}` : "none",
  transition: [
    `background-color ${primitiveTokens.motion.duration.standard}ms ${primitiveTokens.motion.easing.standard}`,
    `border-color ${primitiveTokens.motion.duration.standard}ms ${primitiveTokens.motion.easing.standard}`,
    `color ${primitiveTokens.motion.duration.standard}ms ${primitiveTokens.motion.easing.standard}`,
    `transform ${primitiveTokens.motion.duration.standard}ms ${primitiveTokens.motion.easing.standard}`,
  ].join(", "),
  "&:hover": {
    background: active ? semanticTokens.app.primary : semanticTokens.app.surfaceTintHover,
    transform: "translateY(-1px)",
  },
}));

export const CommandSearchBox = styled(Box)(({ theme }) => ({
  maxWidth: "500px",
  width: "calc(100% - 32px)",
  margin: "0 auto",
  marginBottom: theme.spacing(2),
  zIndex: primitiveTokens.layer.popover,
}));

export const CommandInput = styled(TextField)(() => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: primitiveTokens.radius.md,
    backgroundColor: semanticTokens.app.surfaceStrong,
    fontSize: "0.95rem",
    color: semanticTokens.app.text,
    "& fieldset": {
      borderColor: semanticTokens.app.border,
      borderWidth: "1.5px",
    },
    "&:hover fieldset": { borderColor: semanticTokens.app.textMuted },
    "&.Mui-focused fieldset": { borderColor: semanticTokens.app.primary, borderWidth: "2px" },
  },
  "& .MuiInputLabel-root": {
    color: semanticTokens.app.textMuted,
    fontWeight: 600,
    "&.Mui-focused": { color: semanticTokens.app.primary },
  },
  "& .MuiInputBase-input::placeholder": {
    color: semanticTokens.app.border,
    opacity: 1,
    fontStyle: "italic",
  },
  "& input": { color: semanticTokens.app.text, padding: "12px 16px", fontWeight: 700 },
}));
