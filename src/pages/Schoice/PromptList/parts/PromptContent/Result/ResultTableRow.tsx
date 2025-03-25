import InfoIcon from "@mui/icons-material/Info";
import PostAddIcon from "@mui/icons-material/PostAdd";
import { IconButton, Typography } from "@mui/material";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import { emit } from "@tauri-apps/api/event";
import { sendNotification } from "@tauri-apps/plugin-notification";
import { open } from "@tauri-apps/plugin-shell";
import useDetailWebviewWindow from "../../../../../../hooks/useDetailWebviewWindow";
import useStocksStore from "../../../../../../store/Stock.store";
import DailyUltraTinyLineChart from "./Charts/DailyUltraTinyLineChart";
import WeeklyUltraTinyLineChart from "./Charts/WeeklyUltraTinyLineChart";
import WeekylKfLineChart from "./Charts/WeekylKfLineChart";
import DailyKdLineChart from "./Charts/DailyBollLineChart";

export default function ResultTableRow({
  row,
  index,
}: {
  row: any;
  index: number;
}) {
  const { increase, reload } = useStocksStore();
  const { openDetailWindow } = useDetailWebviewWindow({
    id: row.stock_id,
    name: row.name,
    group: row.market_type,
  });

  const handleAddToWatchList = async () => {
    await reload();
    await increase({
      group: row.industry_group,
      id: row.stock_id,
      name: row.name,
      type: row.market_type,
    });
    await emit("stock-added", { stockNumber: row.stock_id });
    sendNotification({
      title: "SListening List",
      body: `Add ${row.name} Success!`,
    });
  };

  return (
    <TableRow hover role="checkbox" tabIndex={-1}>
      <TableCell key={row + index}>{index + 1}.</TableCell>
      <TableCell key={row + row.t}>{row.t}</TableCell>
      <TableCell key={row + row.stock_id}>{row.stock_id}</TableCell>
      <TableCell key={row + row.name}>{row.name}</TableCell>
      <TableCell key={row + row.c}>{row.c}</TableCell>
      <TableCell>
        <DailyUltraTinyLineChart stock_id={row.stock_id} />
      </TableCell>
      <TableCell>
        <WeeklyUltraTinyLineChart stock_id={row.stock_id} />
      </TableCell>
      <TableCell>
        <DailyKdLineChart stock_id={row.stock_id} />
      </TableCell>
      <TableCell>
        <WeekylKfLineChart stock_id={row.stock_id} />
      </TableCell>
      <TableCell key={row + row.k}>
        <IconButton
          onClick={() =>
            open(
              row.market_type === "上市"
                ? `https://tw.tradingview.com/chart?symbol=TWSE%3A${row.stock_id}`
                : `https://tw.tradingview.com/chart?symbol=TPEX%3A${row.stock_id}`
            )
          }
        >
          <Typography fontSize={16} variant="body2">
            TV
          </Typography>
        </IconButton>
        <IconButton
          onClick={() =>
            open(`https://tw.stock.yahoo.com/q/ta?s=${row.stock_id}`)
          }
        >
          <img
            src="/yahoo.png" // 本地圖片
            alt="自訂圖示"
            style={{ width: 24, height: 24 }}
          />
        </IconButton>
        <IconButton
          onClick={() =>
            open(
              `https://pchome.megatime.com.tw/stock/sto0/ock1/sid${row.stock_id}.html`
            )
          }
        >
          <Typography fontSize={16} variant="body2">
            Pc
          </Typography>
        </IconButton>
        <IconButton onClick={openDetailWindow}>
          <InfoIcon />
        </IconButton>
        <IconButton onClick={handleAddToWatchList}>
          <PostAddIcon />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}
