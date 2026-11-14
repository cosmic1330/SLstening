import { semanticTokens } from "../../../theme";
import { ExpandLess, ShowChart } from "@mui/icons-material";
import { Button, Menu, MenuItem, Typography } from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { UrlTaPerdOptions } from "../../../types";
import { CHART_CONFIG, getChartLabel } from "../constants/chartConfig";

interface ChartMenuProps {
  current: number;
  goToSlide: (index: number) => void;
  perd: UrlTaPerdOptions;
}

const ChartMenu: React.FC<ChartMenuProps> = ({ current, goToSlide, perd }) => {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const highlightedHorizon =
    perd === UrlTaPerdOptions.Hour ? "short" : "mediumLong";

  const handleSelect = (index: number) => {
    goToSlide(index);
    setAnchorEl(null);
  };

  return (
    <>
      <Button
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-label={t("Pages.Detail.GlassBar.selectChart")}
        aria-haspopup="menu"
        aria-expanded={open}
        startIcon={<ShowChart sx={{ fontSize: 17 }} />}
        endIcon={<ExpandLess sx={{ fontSize: 15 }} />}
        sx={{
          minWidth: 76,
          maxWidth: 88,
          height: 40,
          px: 0.8,
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.12)",
          bgcolor: open ? "rgba(144,202,249,0.14)" : "rgba(255,255,255,0.05)",
          textTransform: "none",
          "& .MuiButton-startIcon": { mr: 0.45 },
          "& .MuiButton-endIcon": { ml: 0.2 },
        }}
      >
        <Typography variant="caption" fontWeight={750} noWrap>
          {getChartLabel(CHART_CONFIG[current], t)}
        </Typography>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              mb: 1,
              maxHeight: 360,
              minWidth: 190,
              bgcolor: "rgba(24,28,35,0.98)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 2,
            },
          },
        }}
      >
        {CHART_CONFIG.map((chart, index) => {
          const highlighted = chart.horizon === highlightedHorizon;
          return (
            <MenuItem
              key={chart.id}
              selected={current === index}
              onClick={() => handleSelect(index)}
              sx={{
                minHeight: 40,
                mx: 0.5,
                borderRadius: 1,
                color: highlighted
                  ? semanticTokens.analysis.focus
                  : "rgba(255,255,255,0.76)",
                bgcolor: highlighted ? "rgba(144,202,249,0.08)" : "transparent",
                borderLeft: highlighted
                  ? `3px solid ${semanticTokens.analysis.focus}`
                  : "3px solid transparent",
                "&.Mui-selected": {
                  color: "#fff",
                  bgcolor: "rgba(144,202,249,0.22)",
                },
              }}
            >
              <Typography variant="body2" sx={{ flex: 1 }}>
                {getChartLabel(chart, t)}
              </Typography>
              {highlighted && (
                <Typography variant="caption" sx={{ ml: 1, opacity: 0.8 }}>
                  {t("Pages.Detail.GlassBar.recommended")}
                </Typography>
              )}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

export default ChartMenu;
