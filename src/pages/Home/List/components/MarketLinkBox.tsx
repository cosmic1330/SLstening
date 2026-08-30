import { Box, styled, Tooltip, Typography } from "@mui/material";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useTranslation } from "react-i18next";

const StyledLinkChip = styled("a")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: "4px 12px",
  background: "rgba(50, 50, 50, 0.6)",
  backdropFilter: "blur(12px)",
  borderRadius: "20px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  cursor: "pointer",
  color: "inherit",
  textDecoration: "none",
  transition: "all 0.2s ease",
  "&:hover": {
    background: "rgba(255, 255, 255, 0.12)",
    borderColor: theme.palette.primary.main,
    transform: "translateY(-1px)",
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
      <StyledLinkChip href={url} onClick={handleClick} aria-label={t("a11y.openExternal", { title })}>
        <Box
          sx={{
            color: "rgba(255,255,255,0.6)",
            mr: 1,
            display: "flex",
            fontSize: "16px",
          }}
        >
          {icon}
        </Box>
        <Typography
          sx={{
            fontSize: "12px",
            fontWeight: 800,
            color: "rgba(255,255,255,0.85)",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </Typography>
      </StyledLinkChip>
    </Tooltip>
  );
}
