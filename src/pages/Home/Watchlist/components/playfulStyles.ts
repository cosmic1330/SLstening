import type { SxProps, Theme } from "@mui/material/styles";

export const playfulPalette = {
  canvas: "#FFF8F3",
  paper: "#FFFDF8",
  ink: "#171717",
  muted: "#6D625D",
  outline: "#191919",
  blue: "#6BB7E8",
  blueDark: "#246D9B",
  pink: "#F4B5D0",
  yellow: "#F3D36D",
  green: "#A8D8B8",
  lavender: "#C9BDF2",
  danger: "#D85B54",
  dangerText: "#9B312B",
  dangerSoft: "#FFE3DE",
  white: "#FFFFFF",
} as const;

export const playfulFocusSx: SxProps<Theme> = {
  "&:focus-visible": {
    outline: `3px solid ${playfulPalette.blueDark}`,
    outlineOffset: 3,
  },
};

export const playfulDialogPaperSx: SxProps<Theme> = {
  width: "100%",
  maxWidth: "100%",
  height: { xs: "100%", sm: "min(86vh, 760px)" },
  maxHeight: { xs: "100%", sm: "min(86vh, 760px)" },
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  bgcolor: playfulPalette.canvas,
  color: playfulPalette.ink,
  backgroundImage: `
    radial-gradient(circle at 95% 6%, rgba(107, 183, 232, 0.30) 0 54px, transparent 55px),
    radial-gradient(circle at 4% 90%, rgba(244, 181, 208, 0.30) 0 42px, transparent 43px),
    linear-gradient(135deg, rgba(243, 211, 109, 0.14), transparent 42%),
    linear-gradient(315deg, rgba(168, 216, 184, 0.15), transparent 45%)`,
  border: { xs: 0, sm: `3px solid ${playfulPalette.outline}` },
  borderRadius: { xs: 0, sm: 4 },
  boxShadow: { xs: "none", sm: `8px 9px 0 ${playfulPalette.outline}` },
};

export const playfulDialogTitleSx: SxProps<Theme> = {
  position: "relative",
  flexShrink: 0,
  px: { xs: 2, sm: 3 },
  pt: { xs: 2, sm: 2.5 },
  pb: { xs: 1.5, sm: 2 },
  borderBottom: `2px solid ${playfulPalette.outline}`,
  backgroundColor: "rgba(255, 253, 248, 0.90)",
  "&::after": {
    content: '""',
    position: "absolute",
    right: { xs: 58, sm: 76 },
    top: 12,
    width: 52,
    height: 12,
    borderRadius: 99,
    backgroundColor: playfulPalette.pink,
    border: `2px solid ${playfulPalette.outline}`,
    transform: "rotate(7deg)",
    pointerEvents: "none",
  },
};

export const playfulDialogContentSx: SxProps<Theme> = {
  flex: "1 1 auto",
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
  px: { xs: 2, sm: 3 },
  py: { xs: 2, sm: 2.5 },
};

export const playfulPanelSx: SxProps<Theme> = {
  position: "relative",
  minWidth: 0,
  p: { xs: 1.25, sm: 1.5 },
  border: `2px solid ${playfulPalette.outline}`,
  borderRadius: 3,
  backgroundColor: "rgba(255, 253, 248, 0.90)",
  boxShadow: `4px 5px 0 rgba(25, 25, 25, 0.92)`,
};

export const playfulButtonSx = (backgroundColor: string): SxProps<Theme> => ({
  minHeight: 44,
  minWidth: 44,
  border: `2px solid ${playfulPalette.outline}`,
  borderRadius: 2,
  boxShadow: `3px 3px 0 ${playfulPalette.outline}`,
  bgcolor: backgroundColor,
  color: playfulPalette.ink,
  fontWeight: 900,
  lineHeight: 1.15,
  textTransform: "none",
  transition: "transform 150ms ease, box-shadow 150ms ease, background-color 150ms ease",
  "&:hover": {
    bgcolor: backgroundColor,
    boxShadow: `2px 2px 0 ${playfulPalette.outline}`,
    transform: "translate(1px, 1px)",
  },
  "&:active": {
    boxShadow: `1px 1px 0 ${playfulPalette.outline}`,
    transform: "translate(2px, 2px)",
  },
  ...playfulFocusSx,
  "&.Mui-disabled": {
    color: "rgba(25, 25, 25, 0.68)",
    bgcolor: "#E9E0C7",
    borderColor: "rgba(25, 25, 25, 0.44)",
    boxShadow: "2px 2px 0 rgba(25, 25, 25, 0.38)",
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
  },
});

export const playfulIconButtonSx = (color: string = playfulPalette.ink): SxProps<Theme> => ({
  width: 44,
  height: 44,
  minWidth: 44,
  minHeight: 44,
  flexShrink: 0,
  color,
  border: `2px solid ${playfulPalette.outline}`,
  borderRadius: 2,
  bgcolor: playfulPalette.white,
  boxShadow: `2px 2px 0 ${playfulPalette.outline}`,
  transition: "transform 150ms ease, box-shadow 150ms ease, background-color 150ms ease",
  "&:hover": {
    bgcolor: playfulPalette.white,
    boxShadow: `1px 1px 0 ${playfulPalette.outline}`,
    transform: "translate(1px, 1px)",
  },
  ...playfulFocusSx,
  "&.Mui-disabled": {
    color: "rgba(25, 25, 25, 0.38)",
    bgcolor: "#E9E0C7",
    borderColor: "rgba(25, 25, 25, 0.30)",
    boxShadow: "none",
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
  },
});

export const playfulFieldSx: SxProps<Theme> = {
  "& .MuiInputLabel-root": { color: playfulPalette.muted, fontWeight: 750 },
  "& .MuiInputLabel-root.Mui-focused": { color: playfulPalette.blueDark },
  "& .MuiOutlinedInput-root": {
    minHeight: 48,
    color: playfulPalette.ink,
    bgcolor: playfulPalette.white,
    borderRadius: 2,
    "& fieldset": { border: `2px solid rgba(25, 25, 25, 0.38)` },
    "&:hover fieldset": { borderColor: playfulPalette.outline },
    "&.Mui-focused fieldset": { border: `3px solid ${playfulPalette.blueDark}` },
  },
};

export const playfulDividerSx: SxProps<Theme> = {
  borderColor: "rgba(25, 25, 25, 0.18)",
};
