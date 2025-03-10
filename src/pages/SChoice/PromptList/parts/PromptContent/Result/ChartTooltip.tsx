import { Box } from "@mui/material";
import { IndicatorColorType } from "./types";

export default function ChartTooltip({
  value,
}: {
  value: IndicatorColorType[];
}) {
  return (
    <Box>
      {value.map((v) => (
        <Box key={v.key} sx={{ display: "flex", alignItems: "center" }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: v.color,
              marginRight: 5,
            }}
          />
          <Box>{v.key}</Box>
        </Box>
      ))}
    </Box>
  );
}
