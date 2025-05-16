import { dateFormat } from "@ch20026103/anysis";
import { Mode } from "@ch20026103/anysis/dist/esm/stockSkills/utils/dateFormat";
import type { Options as BacktestOptions } from "@ch20026103/backtest-lib";
import {
  BuyPrice,
  Context,
  SellPrice,
} from "../../../../../../fiwo/backtest_v2/src/";
import PlayCircleFilledWhiteIcon from "@mui/icons-material/PlayCircleFilledWhite";
import {
  Button,
  Container,
  Divider,
  Grid2,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
} from "@mui/material";
import { SetStateAction, useContext, useState } from "react";
import { toast } from "react-toastify";
import { DatabaseContext } from "../../../context/DatabaseContext";
import useSchoiceStore from "../../../store/Schoice.store";
import useStocksStore from "../../../store/Stock.store";
import Options from "./options";
import Progress from "./Progress";
import useBacktestFunc from "./useBacktestFunc";

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
    <Container maxWidth="xl">
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
            {!ctx ? (
              <Button
                onClick={() => {
                  if (!selectedBull || !selectedBear) {
                    toast.error("請選擇多空策略");
                    return;
                  }

                  const buy = (
                    stockId: string,
                    date: number,
                    inWait: boolean
                  ) =>
                    get(stockId, date, inWait, {
                      select: bulls[selectedBull],
                      type: "buy",
                    });
                  const sell = (
                    stockId: string,
                    date: number,
                    inWait: boolean
                  ) =>
                    get(stockId, date, inWait, {
                      select: bears[selectedBear],
                      type: "sell",
                    });
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
                }}
              >
                Create
              </Button>
            ) : (
              <>
                <Button
                  startIcon={<PlayCircleFilledWhiteIcon />}
                  variant="contained"
                  onClick={async () => {
                    setStatus(Status.Running);
                    if (ctx) {
                      let status = true;
                      while (status) {
                        status = await ctx.run();
                        setBacktestPersent(
                          Math.floor(
                            (ctx.dateSequence.historyDates.length /
                              dates.length) *
                              100
                          )
                        );
                      }
                    }
                    setStatus(Status.Idle);
                  }}
                >
                  Run
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => {
                    setCtx(undefined);
                    setStatus(Status.Idle);
                  }}
                >
                  Delete
                </Button>
              </>
            )}
            <Button onClick={() => console.log(ctx)} variant="outlined">
              Console
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
