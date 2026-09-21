import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Box, Stack, styled, Tooltip, Typography } from "@mui/material";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useTranslation } from "react-i18next";
import { primitiveTokens, semanticTokens } from "../../../../theme";

const StyledLinkTile = styled("a")(() => ({
  display: "flex",
  alignItems: "center",
  width: "100%",
  minWidth: 0,
  minHeight: 68,
  boxSizing: "border-box",
  padding: `${primitiveTokens.spacing.sm}px ${primitiveTokens.spacing.md}px`,
  background: semanticTokens.analysis.surfaceGlass,
  backdropFilter: "blur(12px)",
  borderRadius: primitiveTokens.radius.md,
  border: `1px solid ${semanticTokens.analysis.borderSubtle}`,
  cursor: "pointer",
  color: semanticTokens.analysis.text,
  textDecoration: "none",
  transition: [
    `background-color ${primitiveTokens.motion.duration.standard}ms ${primitiveTokens.motion.easing.standard}`,
    `border-color ${primitiveTokens.motion.duration.standard}ms ${primitiveTokens.motion.easing.standard}`,
    `transform ${primitiveTokens.motion.duration.standard}ms ${primitiveTokens.motion.easing.standard}`,
  ].join(", "),
  "&:hover": {
    background: semanticTokens.analysis.surface,
    borderColor: semanticTokens.analysis.focusBorder,
    transform: "translateY(-1px)",
  },
  "&:focus-visible": {
    outline: `3px solid ${semanticTokens.analysis.focus}`,
    outlineOffset: 2,
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
    "&:hover": { transform: "none" },
  },
}));

interface MarketLinkBoxProps {
  title: string;
  url: string;
  icon: React.ReactNode;
}

export default function MarketLinkBox({
  title,
  url,
  icon,
}: MarketLinkBoxProps) {
  const { t } = useTranslation();
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    e.preventDefault();
    openUrl(url);
  };

  return (
    <Tooltip title={t("a11y.openExternal", { title })} arrow>
      <StyledLinkTile
        href={url}
        onClick={handleClick}
        aria-label={t("a11y.openExternal", { title })}
      >
        <Box
          aria-hidden="true"
          sx={{
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            width: 36,
            height: 36,
            mr: 1.25,
            borderRadius: primitiveTokens.radius.sm,
            color: semanticTokens.analysis.focus,
            backgroundColor: semanticTokens.analysis.focusTint,
            fontSize: "17px",
          }}
        >
          {icon}
        </Box>
        <Stack sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              minWidth: 0,
              fontSize: "13px",
              fontWeight: 800,
              lineHeight: 1.3,
              color: semanticTokens.analysis.text,
              overflowWrap: "anywhere",
            }}
          >
            {title}
          </Typography>
        </Stack>
        <OpenInNewIcon
          aria-hidden="true"
          sx={{
            flexShrink: 0,
            ml: 1,
            color: semanticTokens.analysis.textMuted,
            fontSize: 18,
          }}
        />
      </StyledLinkTile>
    </Tooltip>
  );
}
