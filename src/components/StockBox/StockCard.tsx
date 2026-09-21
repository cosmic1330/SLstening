import { Box, Card, CardActionArea, CardContent, styled } from "@mui/material";
import { motion, MotionProps } from "framer-motion";
import { ReactNode } from "react";
import { primitiveTokens, semanticTokens } from "../../theme";

const MotionCard = motion(Card);

const StyledCard = styled(MotionCard)(({ theme }) => ({
  position: "relative",
  background: semanticTokens.analysis.surface,
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${semanticTokens.analysis.borderSubtle}`,
  boxShadow: primitiveTokens.shadow.panel,
  overflow: "hidden",
  height: "100%",
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  boxSizing: "border-box",
  fontFamily: primitiveTokens.font.ui,
  transition: `border-color ${primitiveTokens.motion.duration.fast}ms ${primitiveTokens.motion.easing.standard}, box-shadow ${primitiveTokens.motion.duration.fast}ms ${primitiveTokens.motion.easing.standard}`,
  "&:hover": {
    borderColor: semanticTokens.analysis.focusBorder,
    boxShadow: primitiveTokens.shadow.panel,
  },
  "@media (prefers-reduced-motion: reduce)": { transition: "none" },
}));

interface StockCardProps extends Pick<MotionProps, "initial" | "animate" | "whileHover"> {
  ariaLabel: string;
  cardGlow: string;
  isReady: boolean;
  onOpen: () => void;
  children: ReactNode;
  footer: ReactNode;
}

export default function StockCard({
  ariaLabel,
  cardGlow,
  isReady,
  onOpen,
  children,
  footer,
  initial,
  animate,
  whileHover,
}: StockCardProps) {
  return (
    <StyledCard initial={initial} animate={animate} whileHover={whileHover}>
      <Box
        aria-hidden="true"
        sx={{ position: "absolute", inset: 0, background: cardGlow, pointerEvents: "none", zIndex: 0 }}
      />
      <CardActionArea
        component="button"
        type="button"
        disabled={!isReady}
        aria-label={ariaLabel}
        onClick={onOpen}
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          width: "100%",
          height: "100%",
          borderRadius: 0,
          bgcolor: "transparent",
          "&:focus-visible": {
            outline: `3px solid ${semanticTokens.analysis.focus}`,
            outlineOffset: -3,
          },
        }}
      />
      <CardContent
        sx={{
          position: "relative",
          zIndex: 2,
          p: 2,
          flex: 1,
          pointerEvents: "none",
          "& button, & [role='button'], & a": {
            pointerEvents: "auto",
            position: "relative",
            zIndex: 3,
          },
          "&:last-child": { pb: 2 },
        }}
      >
        {children}
      </CardContent>
      {footer}
    </StyledCard>
  );
}
