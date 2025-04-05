import { Box, Slider, Stack, Typography } from "@mui/material";
import useSchoiceStore from "../../../store/Schoice.store";

export default function RollBackDay() {
  const { todayDate, changeTodayDate } = useSchoiceStore();
  const handleTodayDate = (_: Event, newValue: number | number[]) => {
    changeTodayDate(Number(newValue));
  };

  const valuetext = (value: number) => {
    return `回測${value}天`;
  };

  return (
    <Box>
      <Stack spacing={2} direction="row" alignItems="center">
        <Box>🔙</Box>
        <Typography variant="subtitle1"> 往回天數 {todayDate} 天</Typography>
      </Stack>
      <Slider
        value={todayDate}
        onChange={handleTodayDate}
        defaultValue={0}
        getAriaValueText={valuetext}
        valueLabelDisplay="auto"
        step={1}
        marks
        min={0}
        max={60}
      />
    </Box>
  );
}
