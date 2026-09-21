import { Box } from "@mui/material";
import { ReactNode } from "react";

interface MetricTooltipTriggerProps {
  ariaLabel: string;
  children: ReactNode;
}

export default function MetricTooltipTrigger({
  ariaLabel,
  children,
}: MetricTooltipTriggerProps) {
  return (
    <Box
      component="button"
      type="button"
      aria-label={ariaLabel}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      sx={{
        appearance: "none",
        border: 0,
        bgcolor: "transparent",
        color: "inherit",
        cursor: "help",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        minWidth: 44,
        minHeight: 44,
        p: 0,
        borderRadius: 1,
        "&:focus-visible": {
          outline: "2px solid #90CAF9",
          outlineOffset: 1,
        },
      }}
    >
      {children}
    </Box>
  );
}
