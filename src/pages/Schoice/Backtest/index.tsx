import {
  Button,
  Container,
  Grid2,
  Typography,
  Select,
  MenuItem,
  SelectChangeEvent,
  Stack,
  Divider,
} from "@mui/material";
import { SetStateAction, useContext, useState } from "react";
import useSchoiceStore from "../../../store/Schoice.store";
import useBacktestFunc from "./useBacktestFunc";
import { DatabaseContext } from "../../../context/DatabaseContext";
import { dateFormat } from "@ch20026103/anysis";
import { Mode } from "@ch20026103/anysis/dist/esm/stockSkills/utils/dateFormat";
import {
  BuyPrice,
  Context,
  SellPrice,
} from "../../../../../../fiwo/backtest_v2/dist/esm";
import type { Options as BacktestOptions } from "../../../../../../fiwo/backtest_v2/dist/esm";
import useStocksStore from "../../../store/Stock.store";
import Options from "./options";
import PlayCircleFilledWhiteIcon from "@mui/icons-material/PlayCircleFilledWhite";
import Progress from "./Progress";
import { toast } from "react-toastify";

enum Status {
  Running = "running",
  Idle = "idle",
}

export default function Backtest() {
  const { stocks } = useStocksStore();
  const { bulls, bears, filterStocks, setBacktestPersent } = useSchoiceStore();
  const { dates } = useContext(DatabaseContext);
  const [ctx, setCtx] = useState<Context>();
  const [selectedBull, setSelectedBull] = useState("");
  const [selectedBear, setSelectedBear] = useState("");
  const [selectedStocks, setSelectedStocks] = useState("stocks");
  const [status, setStatus] = useState<Status>(Status.Idle);
  const [options, setOptions] = useState<BacktestOptions>({
    capital: 300000,
    sellPrice: SellPrice.LOW,
    buyPrice: BuyPrice.OPEN,
  });

  const handleBullChange = (
    event: SelectChangeEvent<SetStateAction<string>>
  ) => {
    setSelectedBull(event.target.value);
  };

  const handleBearChange = (
    event: SelectChangeEvent<SetStateAction<string>>
  ) => {
    setSelectedBear(event.target.value);
  };

  const handleStocksChange = (
    event: SelectChangeEvent<SetStateAction<string>>
  ) => {
    setSelectedStocks(event.target.value);
  };

  const get = useBacktestFunc();

  return (
    <Container>
      <Grid2 container>
        <Grid2 size={12}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="subtitle1" gutterBottom>
              Bull Strategy
            </Typography>
            <Select
              value={selectedBull}
              onChange={handleBullChange}
              size="small"
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {Object.keys(bulls).map((key) => (
                <MenuItem key={key} value={key}>
                  {bulls[key].name}
                </MenuItem>
              ))}
            </Select>
            <Typography variant="subtitle1" gutterBottom>
              Bears Strategy
            </Typography>
            <Select
              value={selectedBear}
              onChange={handleBearChange}
              size="small"
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {Object.keys(bears).map((key) => (
                <MenuItem key={key} value={key}>
                  {bears[key].name}
                </MenuItem>
              ))}
            </Select>

            <Typography variant="subtitle1" gutterBottom>
              Stocks
            </Typography>
            <Select
              value={selectedStocks}
              onChange={handleStocksChange}
              size="small"
            >
              <MenuItem value="stocks">
                <em>My Favorite</em>
              </MenuItem>
              {filterStocks && (
                <MenuItem value="filterStocks">
                  <em>Fundamental Filter</em>
                </MenuItem>
              )}
            </Select>
            <Button
              startIcon={<PlayCircleFilledWhiteIcon />}
              variant="contained"
              onClick={async () => {
                if (!selectedBull || !selectedBear) {
                  toast.error("請選擇多空策略");
                  return;
                }
                setStatus(Status.Running);
                const buy = (stockId: string, date: number) =>
                  get(stockId, date, bulls[selectedBull]);
                const sell = (stockId: string, date: number) =>
                  get(stockId, date, bears[selectedBear]);
                const contextDates = dates
                  .reverse()
                  .map((date) => dateFormat(date, Mode.StringToNumber));
                const ctx = new Context({
                  dates: contextDates,
                  stocks:
                    selectedStocks === "filterStocks" ? filterStocks : stocks,
                  buy,
                  sell,
                });
                setCtx(ctx);

                let status = true;
                while (status) {
                  status = await ctx.run();
                  console.log();
                  setBacktestPersent(
                    Math.floor(
                      (ctx.dateSequence.historyDates.length / dates.length) *
                        100
                    )
                  );
                }
                setStatus(Status.Idle);
              }}
            >
              Run Backtest
            </Button>
          </Stack>
          <Options setOptions={setOptions} options={options} />

          {status === Status.Running && <Progress />}
          <Divider sx={{ my: 2 }} />

          <Typography>勝: {ctx?.record.win}</Typography>
          <Typography>敗: {ctx?.record.lose}</Typography>
          <Typography>收益: {ctx?.record.profit}</Typography>
          <Typography>交易次數: {ctx?.record.history.length}</Typography>
        </Grid2>
      </Grid2>
    </Container>
  );
}
