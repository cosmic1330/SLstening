import { Box, Stack, Typography } from "@mui/material";
import { ReactNode } from "react";
import { stockBoxTokens } from "./constants";

interface StockCardHeaderProps {
  id: string;
  type: string;
  name: string;
  lastPrice: number | null;
  percent: number | null;
  priceColor: string;
  priceUnit: string;
  actions: ReactNode;
}

export default function StockCardHeader({ id, type, name, lastPrice, percent, priceColor, priceUnit, actions }: StockCardHeaderProps) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={0.75} mb={1}>
      <Box sx={{ minWidth: 0, flex: 1, pr: 1 }}>
        <Typography noWrap sx={{ color: stockBoxTokens.textMuted, fontSize: "11px", fontWeight: 700, letterSpacing: "0.02em", lineHeight: 1, mb: 0.5 }}>
          {id} · {type}
        </Typography>
        <Typography noWrap sx={{ fontWeight: 800, fontSize: { xs: "15px", sm: "18px" }, color: stockBoxTokens.text, lineHeight: 1 }}>
          {name}
        </Typography>
      </Box>
      <Box sx={{ textAlign: "right", flexShrink: 0 }}>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: "20px", sm: "24px" }, fontVariantNumeric: "tabular-nums", color: priceColor, lineHeight: 1 }}>
          {lastPrice ?? "—"}{lastPrice !== null ? <Box component="span" sx={{ ml: 0.35, fontSize: { xs: "11px", sm: "12px" }, fontWeight: 700 }}>{priceUnit}</Box> : null}
        </Typography>
        <Typography sx={{ fontWeight: 700, fontSize: { xs: "12px", sm: "13px" }, fontVariantNumeric: "tabular-nums", color: priceColor }}>
          {percent === null ? "—" : `${percent > 0 ? "+" : ""}${percent}%`}
        </Typography>
      </Box>
      <Box sx={{ minWidth: 44, flexShrink: 0, pointerEvents: "auto" }}>{actions}</Box>
    </Stack>
  );
}
