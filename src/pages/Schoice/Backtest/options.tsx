import {
  Box,
  TextField,
  Typography,
  Select,
  MenuItem,
  SelectChangeEvent,
  FormControl,
  InputLabel,
} from "@mui/material";
import { SetStateAction } from "react";
import {
  Options as BacktestOptions,
  BuyPrice,
  SellPrice,
} from "../../../../../../fiwo/backtest_v2/dist/esm";

export default function Options({
  options,
  setOptions,
}: {
  options: BacktestOptions;
  setOptions: React.Dispatch<SetStateAction<BacktestOptions>>;
}) {
  const handleChange =
    (key: keyof BacktestOptions) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setOptions((prev) => ({
        ...prev,
        [key]: parseFloat(event.target.value),
      }));
    };

  const handleSelectChange =
    (key: keyof BacktestOptions) => (event: SelectChangeEvent<unknown>) => {
      setOptions((prev) => ({
        ...prev,
        [key]: event.target.value as BuyPrice | SellPrice,
      }));
    };

  return (
    <Box>
      <Typography variant="h5" gutterBottom textTransform="uppercase">
        Options
      </Typography>
      <TextField
        label="本金"
        type="number"
        onChange={handleChange("capital")}
        value={options.capital}
      />
      <TextField
        label="買入股價區間(以上)"
        type="number"
        onChange={handleChange("lowStockPrice")}
      />
      <TextField
        label="買入股價區間(以下)"
        type="number"
        onChange={handleChange("hightStockPrice")}
      />
      <TextField
        label="可承受虧損"
        type="number"
        onChange={handleChange("hightLoss")}
      />
      <FormControl>
        <InputLabel>買入價格位置</InputLabel>
        <Select
          onChange={handleSelectChange("buyPrice")}
          value={options.buyPrice}
        >
          <MenuItem value={BuyPrice.OPEN}>開盤價</MenuItem>
          <MenuItem value={BuyPrice.CLOSE}>收盤價</MenuItem>
          <MenuItem value={BuyPrice.HIGHT}>最高價</MenuItem>
          <MenuItem value={BuyPrice.LOW}>最低價</MenuItem>
        </Select>
      </FormControl>

      <FormControl>
        <InputLabel>賣出價格位置</InputLabel>
        <Select
          onChange={handleSelectChange("sellPrice")}
          value={options.sellPrice}
        >
          <MenuItem value={SellPrice.OPEN}>開盤價</MenuItem>
          <MenuItem value={SellPrice.CLOSE}>收盤價</MenuItem>
          <MenuItem value={SellPrice.HIGHT}>最高價</MenuItem>
          <MenuItem value={SellPrice.LOW}>最低價</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
}
