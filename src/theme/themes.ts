import { createTheme, type ThemeOptions } from "@mui/material/styles";
import { primitiveTokens, semanticTokens } from "./tokens";

const sharedThemeOptions: ThemeOptions = {
  spacing: primitiveTokens.spacing.unit,
  shape: {
    borderRadius: primitiveTokens.radius.md,
  },
  typography: {
    fontFamily: primitiveTokens.font.ui,
  },
  transitions: {
    duration: {
      shortest: primitiveTokens.motion.duration.fast,
      shorter: primitiveTokens.motion.duration.standard,
      short: primitiveTokens.motion.duration.standard,
      standard: primitiveTokens.motion.duration.deliberate,
    },
    easing: {
      easeIn: primitiveTokens.motion.easing.exit,
      easeOut: primitiveTokens.motion.easing.enter,
      easeInOut: primitiveTokens.motion.easing.standard,
      sharp: primitiveTokens.motion.easing.exit,
    },
  },
};

export const appTheme = createTheme({
  ...sharedThemeOptions,
  palette: {
    mode: "light",
    primary: {
      main: semanticTokens.app.primary,
      dark: semanticTokens.app.primaryStrong,
      contrastText: semanticTokens.app.onPrimary,
    },
    secondary: {
      main: semanticTokens.app.accent,
    },
    background: {
      default: semanticTokens.app.canvas,
      paper: semanticTokens.app.surface,
    },
    text: {
      primary: semanticTokens.app.text,
      secondary: semanticTokens.app.textMuted,
    },
  },
});

export const authTheme = createTheme(appTheme, {
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: primitiveTokens.radius.sm,
          textTransform: "none",
          fontWeight: 700,
          boxShadow: primitiveTokens.shadow.button,
          transition: [
            `box-shadow ${primitiveTokens.motion.duration.fast}ms ${primitiveTokens.motion.easing.standard}`,
            `transform ${primitiveTokens.motion.duration.fast}ms ${primitiveTokens.motion.easing.standard}`,
          ].join(", "),
          "&:hover": {
            boxShadow: primitiveTokens.shadow.buttonPressed,
            transform: "translateY(2px)",
          },
          "@media (prefers-reduced-motion: reduce)": {
            transition: "none",
          },
        },
      },
    },
  },
});

export const analysisTheme = createTheme({
  ...sharedThemeOptions,
  palette: {
    mode: "dark",
    primary: {
      main: semanticTokens.analysis.focus,
    },
    background: {
      default: semanticTokens.analysis.canvas,
      paper: semanticTokens.analysis.surfaceGlass,
    },
    text: {
      primary: semanticTokens.analysis.text,
      secondary: semanticTokens.analysis.textMuted,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: semanticTokens.analysis.surfaceGlass,
          backdropFilter: "blur(12px)",
          border: `1px solid ${semanticTokens.analysis.borderSubtle}`,
        },
      },
    },
  },
});

