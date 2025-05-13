import { useState } from "react";
import {
  stockFundamentalQueryBuilder,
  StockFundamentalQueryBuilder,
} from "../../../classes/StockFundamentalQueryBuilder";
import { StorePrompt } from "../../../types";
import {
  Button,
  List,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
} from "@mui/material";

export default function Fundamental() {
  const [prompts, setPrompts] = useState<StorePrompt[]>([]);
  const [selects, setSelects] = useState<StorePrompt>({
    day1: StockFundamentalQueryBuilder.options.days[0],
    indicator1: StockFundamentalQueryBuilder.options.indicators[0],
    operator: StockFundamentalQueryBuilder.options.operators[0],
    day2: StockFundamentalQueryBuilder.options.days[1],
    indicator2: StockFundamentalQueryBuilder.options.indicators[0],
  });

  const timeOptions = StockFundamentalQueryBuilder.options.days;
  const indicators = StockFundamentalQueryBuilder.options.indicators;
  const operators = StockFundamentalQueryBuilder.options.operators;

  const handleChange = (event: SelectChangeEvent<string>) => {
    const { value, name } = event.target;
    setSelects((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCustomChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setSelects((prev) => ({
      ...prev,
      indicator2: value,
    }));
  };

  return (
    <div>
      <h1>Fundamental Analysis</h1>
      <Select
        value={selects.indicator1}
        onChange={handleChange}
        name="indicator1"
        fullWidth
      >
        {indicators.map((indicator) => (
          <MenuItem key={indicator} value={indicator}>
            {indicator}
          </MenuItem>
        ))}
      </Select>
      <Select
        value={selects.operator}
        onChange={handleChange}
        name="operator"
        fullWidth
      >
        {operators.map((op) => (
          <MenuItem key={op} value={op}>
            {op}
          </MenuItem>
        ))}
      </Select>
      <Select
        value={selects.day2}
        onChange={handleChange}
        name="day2"
        fullWidth
      >
        {timeOptions.map((day) => (
          <MenuItem key={day} value={day}>
            {day}
          </MenuItem>
        ))}
      </Select>
      <TextField
        name="indicator2"
        type="number"
        defaultValue={0}
        fullWidth
        onChange={handleCustomChange}
        value={selects.indicator2}
      />
      <Button
        onClick={() => {
          setPrompts((prev) => [...prev, selects]);
        }}
      >
        Add
      </Button>

      <List>
        {prompts.map((prompt, index) => (
          <li key={index}>
            {prompt.indicator1} {prompt.operator} {prompt.indicator2}
          </li>
        ))}
      </List>
    </div>
  );
}
