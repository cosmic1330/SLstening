import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";
import { Box, Button, IconButton } from "@mui/material";
import { listen } from "@tauri-apps/api/event";
import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import useSWR from "swr";
import { tauriFetcher } from "../../api/http_cache";
import { DealsContext } from "../../context/DealsContext";
import { UrlTaPerdOptions, UrlType } from "../../types";
import analyzeIndicatorsData, {
  IndicatorsDateTimeType,
} from "../../utils/analyzeIndicatorsData";
import generateDealDataDownloadUrl from "../../utils/generateDealDataDownloadUrl";
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
    id: "ma_k",
    content: <MaKbar />,
  },
  {
    id: "avg_k",
    content: <AvgMaKbar />,
  },
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
  const [picture, setPicture] = useState<PictoreType>(
    (localStorage.getItem("detail:picture:type") as PictoreType) ||
      PictoreType.Hourly
  );

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
    generateDealDataDownloadUrl({
      type: UrlType.Indicators,
      id: encodeURIComponent(id as string),
      perd:
        picture === PictoreType.Hourly
          ? UrlTaPerdOptions.Hour
          : UrlTaPerdOptions.Day,
    }),
    tauriFetcher
  );

  const deals = useMemo(() => {
    if (!data || !id) return [];
    if (typeof data !== "string") return [];
    return analyzeIndicatorsData(
      data,
      picture === PictoreType.Hourly
        ? IndicatorsDateTimeType.DateTime
        : IndicatorsDateTimeType.Date
    );
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
              localStorage.setItem("detail:picture:type", PictoreType.Hourly);
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
              localStorage.setItem("detail:picture:type", PictoreType.Daily);
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
