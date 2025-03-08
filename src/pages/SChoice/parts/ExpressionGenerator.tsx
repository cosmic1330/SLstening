import {
  Button,
  Box,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
} from "@mui/material";
import { Dispatch, SetStateAction, useState } from "react";
import { Prompt, Prompts } from "../../../store/Schoice.store";

const options = {
  days: ["今天", "昨天", "前天", "3天前", "4天前", "5天前"],
  indicators: [
    "收盤價",
    "開盤價",
    "成交量",
    "最低價",
    "最高價",
    "ma5",
    "ma5扣抵",
    "ma10",
    "ma10扣抵",
    "ma20",
    "ma20扣抵",
    "ma60",
    "ma60扣抵",
    "ma120",
    "ma120扣抵",
    "macd",
    "dif",
    "osc",
    "k",
    "d",
    "rsi5",
    "rsi10",
    "布林上軌",
    "布林中軌",
    "布林下軌",
    "obv",
    "obv5",
  ],
  operators: ["小於", "大於", "等於", "大於等於", "小於等於"],
};

function ExpressionGenerator({
  setPrompts,
}: {
  setPrompts: Dispatch<SetStateAction<Prompts>>;
}) {
  const [selects, setSelects] = useState<Prompt>({
    day1: "今天",
    indicator1: "收盤價",
    operator: "大於",
    day2: "今天",
    indicator2: "ma5",
  });

  const handleChange = (event: SelectChangeEvent<string>) => {
    const { value, name } = event.target;
    setSelects((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <Box>
      <Stack spacing={2} direction="row" my={2}>
        <Select
          value={selects.day1}
          onChange={handleChange}
          name="day1"
          fullWidth
        >
          {options.days.map((day) => (
            <MenuItem key={day} value={day}>
              {day}
            </MenuItem>
          ))}
        </Select>

        <Select
          value={selects.indicator1}
          onChange={handleChange}
          name="indicator1"
          fullWidth
        >
          {options.indicators.map((indicator) => (
            <MenuItem key={indicator} value={indicator}>
              {indicator}
            </MenuItem>
          ))}
        </Select>
      </Stack>
      <Stack mb={2}>
        <Select
          value={selects.operator}
          onChange={handleChange}
          name="operator"
          fullWidth
        >
          {options.operators.map((op) => (
            <MenuItem key={op} value={op}>
              {op}
            </MenuItem>
          ))}
        </Select>
      </Stack>
      <Stack spacing={2} direction="row" mb={2}>
        <Select
          value={selects.day2}
          onChange={handleChange}
          name="day2"
          fullWidth
        >
          {options.days.map((day) => (
            <MenuItem key={day} value={day}>
              {day}
            </MenuItem>
          ))}
        </Select>

        <Select
          value={selects.indicator2}
          onChange={handleChange}
          name="indicator2"
          fullWidth
        >
          {options.indicators.map((indicator) => (
            <MenuItem key={indicator} value={indicator}>
              {indicator}
            </MenuItem>
          ))}
        </Select>
      </Stack>

      <Button
        variant="contained"
        fullWidth
        onClick={() => {
          setPrompts((prev) => [...prev, selects]);
        }}
      >
        加入規則
      </Button>
    </Box>
  );
}

export default ExpressionGenerator;
