import { Box, Button, Stack, Typography, styled } from "@mui/material";
import LanguageIcon from "@mui/icons-material/Language";
import { openUrl } from "@tauri-apps/plugin-opener";

const StyledLinkCard = styled(Box)(() => ({
  position: "relative",
  background: "rgba(30, 30, 35, 0.4)",
  backdropFilter: "blur(16px)",
  borderRadius: "16px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  padding: "12px 16px",
  transition: "all 0.3s ease",
  cursor: "default",
  "&:hover": {
    background: "rgba(40, 40, 45, 0.6)",
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
}));

interface MarketLinkBoxProps {
  title: string;
  url: string;
  icon: React.ReactNode;
}

export default function MarketLinkBox({ title, url, icon }: MarketLinkBoxProps) {
  const handleClick = async () => {
    await openUrl(url);
  };

  return (
    <StyledLinkCard>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{ color: "primary.main", display: "flex" }}>
            {icon}
          </Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
            {title}
          </Typography>
        </Stack>
        <Button
          size="small"
          startIcon={<LanguageIcon sx={{ fontSize: 14 }} />}
          onClick={handleClick}
          sx={{
            borderRadius: "8px",
            color: "primary.main",
            background: "rgba(144, 202, 249, 0.05)",
            fontSize: "0.75rem",
            fontWeight: 700,
            "&:hover": {
              background: "rgba(144, 202, 249, 0.15)",
            },
          }}
        >
          詳情
        </Button>
      </Stack>
    </StyledLinkCard>
  );
}
