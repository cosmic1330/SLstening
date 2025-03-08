import { Box, Slider, Typography } from "@mui/material";
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
    <Box width={500}>
      <Typography variant="h6">🔙 往回天數 {todayDate} 天</Typography>
      <Slider
        value={todayDate}
        onChange={handleTodayDate}
        defaultValue={30}
        getAriaValueText={valuetext}
        valueLabelDisplay="auto"
        step={1}
        marks
        min={0}
        max={20}
      />
    </Box>
  );
}
