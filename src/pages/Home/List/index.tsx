import {
  Box,
  Container,
  Divider,
  Grid,
  Stack,
  Typography,
  Alert,
  Snackbar,
} from "@mui/material";
import { listen } from "@tauri-apps/api/event";
import { info } from "@tauri-apps/plugin-log";
import { memo, useEffect, useMemo, useState } from "react";
import { STOCK_BOX_HEIGHT } from "../../../components/StockBox";
import VirtualizedStockList from "../../../components/VirtualizedStockList";
import useElementHeight from "../../../hooks/useElementHeight";
import { useShowMarketInfo } from "../../../hooks/useShowMarketInfo";
import useStocksStore from "../../../store/Stock.store";
import { FutureIds } from "../../../types";
import MarketIndexBox from "./components/MarketIndexBox";
import MarketLinkBox from "./components/MarketLinkBox";

import AnalyticsIcon from "@mui/icons-material/Analytics";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ListAltIcon from "@mui/icons-material/ListAlt";
import SpeedIcon from "@mui/icons-material/Speed";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { useTranslation } from "react-i18next";

/**
 * DashboardHeader 元件
 * 包含所有市場指標與宏觀工具，將作為虛擬列表的 Header 注入
 */
const DashboardHeader = memo(
  ({ stocksCount, visibility }: { stocksCount: number; visibility: any }) => {
    const { t } = useTranslation();
    const marketIndices = useMemo(
      () =>
        [
          {
            id: FutureIds.TWSE,
            name: t("home.indices.twse"),
            group: "大盤",
            visible: visibility?.twse ?? true,
          },
          {
            id: FutureIds.OTC,
            name: t("home.indices.otc"),
            group: "大盤",
            visible: visibility?.otc ?? true,
          },
          {
            id: FutureIds.NASDAQ,
            name: t("home.indices.nasdaq"),
            group: "美股",
            visible: visibility?.nasdaq ?? true,
          },
          {
            id: FutureIds.WTX,
            name: t("home.indices.wtx"),
            group: "期權",
            visible: visibility?.wtx ?? true,
          },
        ].filter((i) => i.visible),
      [t, visibility],
    );

    const marketLinks = useMemo(
      () =>
        [
          {
            title: t("home.links.cnn"),
            url: "https://www.macromicro.me/charts/50108/cnn-fear-and-greed",
            icon: <SpeedIcon />,
            visible: visibility?.cnn ?? true,
          },
          {
            title: t("home.links.mm"),
            url: "https://www.macromicro.me/charts/128747/taiwan-mm-fear-and-greed-index-vs-taiex",
            icon: <AnalyticsIcon />,
            visible: visibility?.mm ?? true,
          },
          {
            title: t("home.links.margin"),
            url: "https://www.macromicro.me/charts/53117/taiwan-taiex-maintenance-margin",
            icon: <TrendingUpIcon />,
            visible: visibility?.margin ?? true,
          },
        ].filter((l) => l.visible),
      [t, visibility],
    );

    return (
      <Box sx={{ pt: 2, pb: 1, width: "100%" }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <DashboardIcon sx={{ color: "primary.main", fontSize: 20 }} />
          <Typography
            sx={{
              fontWeight: 900,
              color: "primary.main",
              fontSize: "14px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {t("home.marketOverview")}
          </Typography>
        </Stack>

        <Grid container spacing={1.5} mb={3}>
          {marketIndices.map((index) => (
            <Grid key={index.id} size={{ xs: 12, sm: 6, md: 3 }}>
              <MarketIndexBox {...index} />
            </Grid>
          ))}
        </Grid>

        {marketLinks.length > 0 && (
          <Box
            sx={{
              p: 1.5,
              borderRadius: "16px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              mb: 4,
            }}
          >
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
            >
              <Typography
                sx={{
                  fontSize: "11px",
                  fontWeight: 900,
                  color: "primary.main",
                  mr: 1,
                }}
              >
                {t("home.macro")}
              </Typography>
              {marketLinks.map((link) => (
                <MarketLinkBox key={link.title} {...link} />
              ))}
            </Stack>
          </Box>
        )}

        <Divider sx={{ borderColor: "rgba(255,255,255,0.05)", mb: 4 }} />

        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
          <ListAltIcon sx={{ color: "primary.main", fontSize: 20 }} />
          <Typography
            sx={{
              fontWeight: 900,
              color: "primary.main",
              fontSize: "14px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {t("home.watchlist")}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Typography
            sx={{
              fontSize: "11px",
              fontWeight: 800,
              color: "rgba(255,255,255,0.4)",
            }}
          >
            {t("home.trackedCount", { count: stocksCount })}
          </Typography>
        </Stack>
      </Box>
    );
  },
);

function List() {
  const { t } = useTranslation();
  const { stocks = [], reload } = useStocksStore();
  const visibility = useShowMarketInfo();
  const { ref: listContainerRef, height: listHeight } =
    useElementHeight<HTMLDivElement>();
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setup = async () => {
      unlisten = await listen("api-blocked", () => {
        setIsBlocked(true);
      });
    };

    setup();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  useEffect(() => {
    let unlistenadd: (() => void) | null = null;
    let unlistenremoved: (() => void) | null = null;

    const setupListeners = async () => {
      unlistenadd = await listen("stock-added", async (event: any) => {
        await reload();
        info(`stock add ${event.payload?.stockNumber}`);
      });
      unlistenremoved = await listen("stock-removed", async (event: any) => {
        await reload();
        info(`stock removed ${event.payload?.stockNumber}`);
      });
    };

    setupListeners();
    return () => {
      if (unlistenadd) unlistenadd();
      if (unlistenremoved) unlistenremoved();
    };
  }, [reload]);

  const dashboardHeader = useMemo(
    () => (
      <>
        <DashboardHeader
          stocksCount={stocks?.length || 0}
          visibility={visibility}
        />
        {stocks.length === 0 && (
          <Box
            sx={{
              py: 8,
              textAlign: "center",
              borderRadius: "20px",
              border: "2px dashed rgba(255,255,255,0.05)",
              mt: 2,
              mx: 2,
            }}
          >
            <Typography
              sx={{ color: "rgba(255,255,255,0.3)", fontWeight: 700 }}
            >
              {t("home.emptyWatchlist")}
            </Typography>
          </Box>
        )}
      </>
    ),
    [stocks?.length, t, visibility],
  );

  return (
    <Container
      maxWidth="xl"
      disableGutters
      sx={{ 
        height: "100%",
        display: "flex", 
        flexDirection: "column",
        overflow: "hidden" 
      }}
    >
      <Box
        ref={listContainerRef}
        sx={{ flex: 1, minHeight: 0, position: "relative" }}
      >
        <VirtualizedStockList
          stocks={stocks}
          height={listHeight}
          itemHeight={STOCK_BOX_HEIGHT}
          header={dashboardHeader}
        />
      </Box>

      <Snackbar
        open={isBlocked}
        autoHideDuration={6000}
        onClose={() => setIsBlocked(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setIsBlocked(false)}
          severity="error"
          variant="filled"
          sx={{ width: "100%", fontWeight: 700 }}
        >
          {t("home.yahooRateLimited")}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default List;
