import {
  ArrowBackIosNew,
  ArrowForwardIos,
  InfoOutlined,
  Settings,
} from "@mui/icons-material";
import {
  Box,
  Divider,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { UrlTaPerdOptions } from "../../../types";
import Fundamental from "../Tooltip/Fundamental";
import { CHART_CONFIG } from "../constants/chartConfig";
import ChartMenu from "./ChartMenu";
import { TOOLBAR_SETTINGS_EVENT } from "./useToolbarSettings";

interface GlassBarProps {
  perd: UrlTaPerdOptions;
  setPerd: (perd: UrlTaPerdOptions) => void;
  current: number;
  goToSlide: (index: number) => void;
  onOpenDoc: () => void;
  currentId: string;
}

const GlassBar: React.FC<GlassBarProps> = ({
  perd,
  setPerd,
  current,
  goToSlide,
  onOpenDoc,
  currentId,
}) => {
  const { t } = useTranslation();
  const { id } = useParams();
  const currentChart = CHART_CONFIG[current];
  const hasSettings = [
    "ma",
    "ema",
    "atr",
    "bollean",
    "Donchian",
    "volume_profile",
  ].includes(currentId);
  const setPeriod = (next: UrlTaPerdOptions | null) => {
    if (!next) return;
    localStorage.setItem("detail:perd:type", next);
    setPerd(next);
  };

  return (
    <Box
      component="nav"
      aria-label={t("Pages.Detail.GlassBar.navigation")}
      sx={{
        position: "relative",
        zIndex: 20,
        flexShrink: 0,
        minHeight: 56,
        px: 0.75,
        py: 0.65,
        bgcolor: "rgba(15,18,20,0.96)",
        borderTop: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 -8px 24px rgba(0,0,0,0.2)",
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
        <Tooltip title={t("Pages.Detail.GlassBar.previous")}>
          <IconButton
            onClick={() => goToSlide(current - 1)}
            aria-label={t("Pages.Detail.GlassBar.previous")}
            sx={{ width: 40, height: 40, color: "rgba(255,255,255,0.76)" }}
          >
            <ArrowBackIosNew sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>

        <ChartMenu current={current} goToSlide={goToSlide} />

        <Tooltip title={t("Pages.Detail.GlassBar.next")}>
          <IconButton
            onClick={() => goToSlide(current + 1)}
            aria-label={t("Pages.Detail.GlassBar.next")}
            sx={{ width: 40, height: 40, color: "rgba(255,255,255,0.76)" }}
          >
            <ArrowForwardIos sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>

        <Divider
          orientation="vertical"
          flexItem
          sx={{ mx: 0.25, borderColor: "rgba(255,255,255,0.12)" }}
        />

        <ToggleButtonGroup
          exclusive
          size="small"
          value={perd}
          onChange={(_, next) => setPeriod(next)}
          aria-label={t("Pages.Detail.GlassBar.period")}
          sx={{
            "& .MuiToggleButton-root": {
              minWidth: 36,
              height: 40,
              px: 0.75,
              color: "rgba(255,255,255,0.62)",
              borderColor: "rgba(255,255,255,0.12)",
              fontSize: 12,
              fontWeight: 750,
              "&.Mui-selected": {
                color: "#fff",
                bgcolor: "rgba(144,202,249,0.16)",
              },
            },
          }}
        >
          <ToggleButton value={UrlTaPerdOptions.Hour}>
            {t("Pages.Detail.GlassBar.hourShort")}
          </ToggleButton>
          <ToggleButton value={UrlTaPerdOptions.Day}>
            {t("Pages.Detail.GlassBar.dayShort")}
          </ToggleButton>
          <ToggleButton value={UrlTaPerdOptions.Week}>
            {t("Pages.Detail.GlassBar.weekShort")}
          </ToggleButton>
        </ToggleButtonGroup>

        {hasSettings && (
          <Tooltip title={t("Pages.Detail.GlassBar.settings")}>
            <IconButton
              onClick={(event) =>
                window.dispatchEvent(
                  new CustomEvent(TOOLBAR_SETTINGS_EVENT, {
                    detail: { anchor: event.currentTarget },
                  }),
                )
              }
              aria-label={t("Pages.Detail.GlassBar.settings")}
              sx={{ width: 40, height: 40, color: "#90caf9" }}
            >
              <Settings sx={{ fontSize: 19 }} />
            </IconButton>
          </Tooltip>
        )}

        <Tooltip
          arrow
          placement="top"
          title={
            <Stack spacing={0.75} sx={{ maxWidth: 280 }}>
              <Box sx={{ fontWeight: 750 }}>{currentChart?.title}</Box>
              <Box sx={{ fontSize: 12 }}>{currentChart?.timezoneAdvice}</Box>
              {id && <Fundamental id={id} />}
            </Stack>
          }
        >
          <IconButton
            onClick={onOpenDoc}
            aria-label={t("Pages.Detail.GlassBar.details")}
            sx={{ width: 40, height: 40, color: "#90caf9" }}
          >
            <InfoOutlined sx={{ fontSize: 19 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
};

export default GlassBar;
