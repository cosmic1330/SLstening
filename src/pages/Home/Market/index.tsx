import AnalyticsIcon from "@mui/icons-material/Analytics";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SpeedIcon from "@mui/icons-material/Speed";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { Box, Container, Grid, Stack, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useShowMarketInfo } from "../../../hooks/useShowMarketInfo";
import { analysisTheme, semanticTokens } from "../../../theme";
import { FutureIds } from "../../../types";
import MarketIndexBox from "../List/components/MarketIndexBox";
import MarketLinkBox from "../List/components/MarketLinkBox";

export default function Market() {
  const { t } = useTranslation();
  const visibility = useShowMarketInfo();
  const indices = useMemo(() => [
    { id: FutureIds.TWSE, name: t("home.indices.twse"), group: t("home.groups.tw"), visible: visibility.twse },
    { id: FutureIds.OTC, name: t("home.indices.otc"), group: t("home.groups.tw"), visible: visibility.otc },
    { id: FutureIds.NASDAQ, name: t("home.indices.nasdaq"), group: t("home.groups.us"), visible: visibility.nasdaq },
    { id: FutureIds.WTX, name: t("home.indices.wtx"), group: t("home.groups.futures"), visible: visibility.wtx },
  ].filter((item) => item.visible), [t, visibility]);
  const links = useMemo(() => [
    { title: t("home.links.cnn"), url: "https://www.macromicro.me/charts/50108/cnn-fear-and-greed", icon: <SpeedIcon />, visible: visibility.cnn },
    { title: t("home.links.mm"), url: "https://www.macromicro.me/charts/128747/taiwan-mm-fear-and-greed-index-vs-taiex", icon: <AnalyticsIcon />, visible: visibility.mm },
    { title: t("home.links.margin"), url: "https://www.macromicro.me/charts/53117/taiwan-taiex-maintenance-margin", icon: <TrendingUpIcon />, visible: visibility.margin },
  ].filter((item) => item.visible), [t, visibility]);
  return <ThemeProvider theme={analysisTheme}><Box sx={{ height: "100%", overflowY: "auto", bgcolor: semanticTokens.analysis.canvas, color: semanticTokens.analysis.text }}>
    <Container maxWidth="xl" sx={{ py: 2, pb: 12 }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={2}><DashboardIcon color="primary" /><Typography fontWeight={900}>{t("home.marketOverview")}</Typography></Stack>
      <Grid container spacing={1.5}>{indices.map((index) => <Grid key={index.id} size={{ xs: 12, sm: 6, md: 3 }}><MarketIndexBox {...index} /></Grid>)}</Grid>
      {links.length > 0 && (
        <Box
          component="section"
          aria-labelledby="market-macro-title"
          sx={{
            mt: 3,
            p: 2,
            border: `1px solid ${semanticTokens.analysis.borderSubtle}`,
            borderRadius: 2,
            bgcolor: semanticTokens.analysis.surfaceSubtle,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <AnalyticsIcon
              aria-hidden="true"
              sx={{ color: semanticTokens.analysis.focus, fontSize: 20 }}
            />
            <Typography
              id="market-macro-title"
              component="h2"
              variant="caption"
              fontWeight={800}
              sx={{ color: semanticTokens.analysis.text }}
            >
              {t("home.macro")}
            </Typography>
          </Stack>
          <Grid container spacing={1.5} sx={{ mt: 1 }}>
            {links.map((link) => (
              <Grid
                key={link.title}
                size={{ xs: 12, sm: 4, md: 4 }}
                sx={{ minWidth: 0, display: "flex" }}
              >
                <MarketLinkBox {...link} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Container>
  </Box></ThemeProvider>;
}
