import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";
import { Box, Button, IconButton } from "@mui/material";
import { listen } from "@tauri-apps/api/event";
import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import useSWR from "swr";
import { tauriFetcher } from "../../api/http_cache";
import { DealsContext } from "../../context/DealsContext";
import { TaType } from "../../types";
import formatDateTime from "../../utils/formatDateTime";
import generateDealDataDownloadUrl, {
  UrlTaPerdOptions,
  UrlType,
} from "../../utils/generateDealDataDownloadUrl";
import AvgMaKbar from "./AvgMaKbar";
import Close from "./Close";
import Kd from "./Kd";
import Ma from "./Ma";
import MaKbar from "./MaKbar";
import MJ from "./MJ";
import MR from "./MR";
import Obv from "./Obv";

const slides = [
  {
    id: "obv",
    content: <Obv />,
  },
  {
    id: "ma",
    content: <Ma />,
  },
  {
    id: "mj",
    content: <MJ />,
  },
  {
    id: "mr",
    content: <MR />,
  },
  {
    id: "kd",
    content: <Kd />,
  },
  {
    id: "ma_k",
    content: <MaKbar />,
  },
  {
    id: "avg_k",
    content: <AvgMaKbar />,
  },
  {
    id: "low_close",
    content: <Close />,
  },
];

enum PictoreType {
  Daily = "daily",
  Hourly = "hourly",
}

const FullscreenVerticalCarousel: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [scrolling, setScrolling] = useState(false);
  const [picture, setPicture] = useState(PictoreType.Daily);

  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < slides.length) {
      setCurrent(index);
    } else if (index < 0) {
      setCurrent(slides.length - 1);
    } else if (index >= slides.length) {
      setCurrent(0);
    }
  }, []);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (scrolling) return;
      setScrolling(true);

      if (e.deltaY > 0) {
        goToSlide(current + 1);
      } else if (e.deltaY < 0) {
        goToSlide(current - 1);
      }

      setTimeout(() => setScrolling(false), 800);
    },
    [current, scrolling, goToSlide]
  );

  useEffect(() => {
    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const slideVariants = {
    initial: (direction: number) => ({
      y: direction > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    animate: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.3, ease: "easeInOut" },
    },
    exit: (direction: number) => ({
      y: direction > 0 ? "-100%" : "100%",
      opacity: 0,
      transition: { duration: 0.3, ease: "easeInOut" },
    }),
  };

  const direction = (next: number) => next - current;

  // data
  const navigate = useNavigate();

  useEffect(() => {
    // 监听股票添加事件
    const unlisten = listen("detail", (event: any) => {
      const { url } = event.payload;
      navigate(url);
    });

    return () => {
      unlisten.then((fn) => fn()); // 清理监听器
    };
  }, []);

  const { id } = useParams();

  const { data } = useSWR(
    id === "twse" && picture === PictoreType.Hourly
      ? `https://tw.stock.yahoo.com/_td-stock/api/resource/FinanceChartService.ApacLibraCharts;period=60m;symbols=%5B%22%5ETWII%22%5D?bkt=%5B%22TW-Stock-mWeb-NewTechCharts-Rampup%22%2C%22c00-stock-lumos-prod%22%5D&device=smartphone&ecma=modern&feature=enableGAMAds%2CenableGAMEdgeToEdge%2CenableEvPlayer%2CenableHighChart&intl=tw&lang=zh-Hant-TW&partner=none&prid=5l4ebc1jud6ac&region=TW&site=finance&tz=Asia%2FTaipei&ver=1.4.511`
      : id === "twse" && picture === PictoreType.Daily
      ? `https://tw.stock.yahoo.com/_td-stock/api/resource/FinanceChartService.ApacLibraCharts;period=d;symbols=%5B%22%5ETWII%22%5D?bkt=%5B%22TW-Stock-mWeb-NewTechCharts-Rampup%22%2C%22c00-stock-lumos-prod%22%5D&device=smartphone&ecma=modern&feature=enableGAMAds%2CenableGAMEdgeToEdge%2CenableEvPlayer%2CenableHighChart&intl=tw&lang=zh-Hant-TW&partner=none&prid=5l4ebc1jud6ac&region=TW&site=finance&tz=Asia%2FTaipei&ver=1.4.511`
      : picture === PictoreType.Hourly
      ? generateDealDataDownloadUrl({
          type: UrlType.Ta,
          id: id || "",
          perd: UrlTaPerdOptions.Hour,
        })
      : generateDealDataDownloadUrl({
          type: UrlType.Ta,
          id: id || "",
          perd: UrlTaPerdOptions.Day,
        }),
    tauriFetcher
  );

  const deals = useMemo(() => {
    if (!data || !id) return [];
    if (id === "twse") {
      const json = JSON.parse(data as string);
      const opens = json[0].chart.indicators.quote[0].open;
      const closes = json[0].chart.indicators.quote[0].close;
      const highs = json[0].chart.indicators.quote[0].high;
      const lows = json[0].chart.indicators.quote[0].low;
      const volumes = json[0].chart.indicators.quote[0].volume;
      const ts = json[0].chart.timestamp;

      const response: TaType = [];
      for (let i = 0; i < opens.length; i++) {
        if (opens[i] !== null) {
          response.push({
            t: formatDateTime(
              new Date(ts[i] * 1000).getTime()
            ) as unknown as number,
            o: opens[i],
            c: closes[i],
            h: highs[i],
            l: lows[i],
            v: volumes[i],
          });
        }
      }
      return response;
    } else {
      const ta_index = (data as string).indexOf('"ta":');
      const json_ta = "{" + (data as string).slice(ta_index).replace(");", "");
      const parse = JSON.parse(json_ta);
      const response = parse.ta as TaType;
      return response;
    }
  }, [data, id, picture]);

  return (
    <Box position="relative" width="100vw" height="100vh" overflow="hidden">
      <DealsContext.Provider value={deals}>
        <AnimatePresence custom={direction(current)} mode="wait">
          <motion.div
            key={slides[current].id}
            custom={direction(current)}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {slides[current].content}
          </motion.div>
        </AnimatePresence>

        <Box position="absolute" right="0%">
          <Button
            color="primary"
            sx={{
              backgroundColor: "rgba(255,255,255,0.3)",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.5)" },
            }}
            variant={picture === PictoreType.Hourly ? "contained" : "text"}
            disabled={picture === PictoreType.Hourly}
            onClick={() => {
              setPicture(PictoreType.Hourly);
            }}
          >
            小時圖
          </Button>
          <Button
            color="primary"
            sx={{
              backgroundColor: "rgba(255,255,255,0.3)",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.5)" },
            }}
            variant={picture === PictoreType.Daily ? "contained" : "text"}
            disabled={picture === PictoreType.Daily}
            onClick={() => {
              setPicture(PictoreType.Daily);
            }}
          >
            日線圖
          </Button>
          <IconButton
            onClick={() => goToSlide(current - 1)}
            color="primary"
            sx={{
              backgroundColor: "rgba(255,255,255,0.3)",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.5)" },
            }}
          >
            <KeyboardArrowUp />
          </IconButton>
          <IconButton
            onClick={() => goToSlide(current + 1)}
            color="primary"
            sx={{
              backgroundColor: "rgba(255,255,255,0.3)",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.5)" },
            }}
          >
            <KeyboardArrowDown />
          </IconButton>
        </Box>
      </DealsContext.Provider>
    </Box>
  );
};

export default FullscreenVerticalCarousel;
