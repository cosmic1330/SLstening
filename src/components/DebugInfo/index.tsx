import { Box, Typography } from "@mui/material";
import { useEffect, useState } from "react";

interface DebugInfoProps {
  visibleStartIndex: number;
  visibleStopIndex: number;
  totalItems: number;
}

export default function DebugInfo({
  visibleStartIndex,
  visibleStopIndex,
  totalItems,
}: DebugInfoProps) {
  const [apiRequests, setApiRequests] = useState(0);

  useEffect(() => {
    // 計算當前可見範圍內的項目數量
    const visibleItemsCount = visibleStopIndex - visibleStartIndex + 1;
    setApiRequests(visibleItemsCount);
  }, [visibleStartIndex, visibleStopIndex]);

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
      }}
    >
      <Typography variant="caption" display="block">
        總項目數: {totalItems}
      </Typography>
      <Typography variant="caption" display="block">
        可見範圍: {visibleStartIndex} - {visibleStopIndex}
      </Typography>
      <Typography variant="caption" display="block">
        API 請求數: {apiRequests}
      </Typography>
      <Typography variant="caption" display="block" color="lime">
        只有 {apiRequests} 個項目在請求數據！
      </Typography>
    </Box>
  );
}
