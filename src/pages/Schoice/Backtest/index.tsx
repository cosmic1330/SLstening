import { dateFormat } from "@ch20026103/anysis";
import { Mode } from "@ch20026103/anysis/dist/esm/stockSkills/utils/dateFormat";
import type { Options as BacktestOptions } from "@ch20026103/backtest-lib";
import { BuyPrice, Context, SellPrice } from "@ch20026103/backtest-lib";
import PlayCircleFilledWhiteIcon from "@mui/icons-material/PlayCircleFilledWhite";
import {
  Button,
  Container,
  Divider,
  Grid2,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
} from "@mui/material";
import { SetStateAction, useCallback, useContext, useState } from "react";
import { toast } from "react-toastify";
import { DatabaseContext } from "../../../context/DatabaseContext";
import useSchoiceStore from "../../../store/Schoice.store";
import useStocksStore from "../../../store/Stock.store";
import BacktestResult from "./BacktestResult";
import Options from "./options";
import Progress from "./Progress";
import useBacktestFunc, { BacktestType } from "./useBacktestFunc";

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

  const createContext = useCallback(() => {
    setBacktestPersent(0);
    if (!selectedBull || !selectedBear) {
      toast.error("請選擇多空策略");
      return;
    }

    const buy = (stockId: string, date: number, inWait: boolean) =>
      get(stockId, date, inWait, {
        select: bulls[selectedBull],
        type: BacktestType.Buy,
      });
    const sell = (stockId: string, date: number, inWait: boolean) =>
      get(stockId, date, inWait, {
        select: bears[selectedBear],
        type: BacktestType.Sell,
      });
    const contextDates = [...dates]
      .reverse()
      .map((date) => dateFormat(date, Mode.StringToNumber));
    const ctx = new Context({
      dates: contextDates,
      stocks: selectedStocks === "filterStocks" ? filterStocks : stocks,
      buy,
      sell,
    });
    setCtx(ctx);
  }, [
    selectedBull,
    selectedBear,
    selectedStocks,
    filterStocks,
    stocks,
    dates,
    get,
  ]);

  const run = useCallback(async () => {
    setStatus(Status.Running);
    if (ctx) {
      sessionStorage.removeItem("schoice:backtest:run");
      let status = true;
      while (status) {
        status = await ctx.run();
        if (sessionStorage.getItem("schoice:backtest:run") === "false") {
          status = false;
        }
        setBacktestPersent(
          Math.floor(
            (ctx.dateSequence.historyDates.length / dates.length) * 100
          )
        );
      }
    }
    setStatus(Status.Idle);
  }, [ctx, setBacktestPersent, dates]);

  const stop = useCallback(() => {
    setStatus(Status.Idle);
    sessionStorage.setItem("schoice:backtest:run", "false");
  }, []);

  const remove = useCallback(() => {
    setCtx(undefined);
    sessionStorage.setItem("schoice:backtest:run", "false");
    setStatus(Status.Idle);
  }, []);

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" gutterBottom>
        Trading Analysis Dashboard
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        Compare and analyze trading strategies
      </Typography>
      <Paper
        elevation={16}
        sx={{ padding: 2, marginBottom: 2, borderRadius: 2 }}
      >
        <Grid2 container spacing={3}>
          <Grid2 size={4}>
            <Typography variant="subtitle1" gutterBottom>
              Bull Strategy
            </Typography>
            <Select
              fullWidth
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
          </Grid2>

          <Grid2 size={4}>
            <Typography variant="subtitle1" gutterBottom>
              Bears Strategy
            </Typography>

            <Select
              value={selectedBear}
              onChange={handleBearChange}
              size="small"
              fullWidth
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
          </Grid2>

          <Grid2 size={4}>
            <Typography variant="subtitle1" gutterBottom>
              Source
            </Typography>
            <Select
              value={selectedStocks}
              onChange={handleStocksChange}
              size="small"
              fullWidth
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
          </Grid2>

          {/* Additional Options */}
          <Grid2 size={12}>
            <Typography variant="subtitle1" gutterBottom>
              Additional Options
            </Typography>
            <Options setOptions={setOptions} options={options} />
          </Grid2>

          <Grid2 size={12}>
            <Stack direction="row" spacing={2} justifyContent="center">
              {!ctx && status === Status.Idle && (
                <Button variant="contained" onClick={createContext}>
                  Create
                </Button>
              )}
              {ctx && status === Status.Idle && (
                <Button
                  variant="contained"
                  startIcon={<PlayCircleFilledWhiteIcon />}
                  onClick={run}
                >
                  Execute Analysis
                </Button>
              )}
              {ctx && status === Status.Running && (
                <Button variant="outlined" onClick={stop}>
                  Stop
                </Button>
              )}
              {ctx && (
                <Button variant="outlined" color="error" onClick={remove}>
                  Delete
                </Button>
              )}
            </Stack>
          </Grid2>
        </Grid2>
      </Paper>

      {ctx && <Progress />}
      <Divider />
      {ctx && <BacktestResult ctx={ctx} />}
    </Container>
  );
}
