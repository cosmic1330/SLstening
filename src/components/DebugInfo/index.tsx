import { Box, Typography } from "@mui/material";
import useDebugStore from "../../store/debug.store";

interface DebugInfoProps {
  visibleStartIndex?: number;
  visibleStopIndex?: number;
  totalItems?: number;
}

export default function DebugInfo({
  visibleStartIndex,
  visibleStopIndex,
  totalItems,
}: DebugInfoProps) {
  const { counts, isVisible, activeInstanceCounts } = useDebugStore();

  if (!isVisible) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        top: 10,
        right: 10,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        color: "#fff",
        padding: 2,
        borderRadius: 1,
        zIndex: 1000,
        pointerEvents: "none", // 避免干擾點擊
        minWidth: 240,
      }}
    >
      <Typography
        variant="caption"
        display="block"
        color="tomato"
        sx={{ fontWeight: "bold", mb: 0.5 }}
      >
        [DEBUG MODE - Ctrl+Shift+D]
      </Typography>
      {totalItems !== undefined && (
        <Typography variant="caption" display="block">
          列表總項數: {totalItems}
        </Typography>
      )}
      {visibleStartIndex !== undefined && visibleStopIndex !== undefined && (
        <Typography variant="caption" display="block">
          可見索引: {visibleStartIndex} - {visibleStopIndex}
        </Typography>
      )}
      <Typography
        variant="caption"
        display="block"
        sx={{ mt: 1, borderTop: "1px solid rgba(255,255,255,0.2)", pt: 0.5 }}
      >
        各請求已更新次數:
      </Typography>
      <Typography variant="caption" display="block" color="lime">
        WTX: {counts.wtx} | TWSE: {counts.twse} | NASDAQ: {counts.nasdaq}
      </Typography>
      <Typography variant="caption" display="block" color="cyan">
        OTC: {counts.otc} | Cond: {counts.conditional}
      </Typography>
      <Typography
        variant="caption"
        display="block"
        color="yellow"
        sx={{ mt: 0.5 }}
      >
        活跃個股實例數 (Cond): {activeInstanceCounts}
      </Typography>
    </Box>
  );
}
