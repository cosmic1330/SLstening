import InfoIcon from "@mui/icons-material/Info";
import { IconButton, Typography } from "@mui/material";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import { open } from "@tauri-apps/plugin-shell";
import useDetailWebviewWindow from "../../../../../../hooks/useDetailWebviewWindow";

export default function ResultTableRow({ row }: { row: any }) {
  const { openDetailWindow } = useDetailWebviewWindow({
    id: row.stock_id,
    name: row.name,
    group: row.market_type,
  });
  return (
    <TableRow hover role="checkbox" tabIndex={-1}>
      <TableCell key={row + row.t}>{row.t}</TableCell>
      <TableCell key={row + row.stock_id}>{row.stock_id}</TableCell>
      <TableCell key={row + row.name}>{row.name}</TableCell>
      <TableCell key={row + row.c}>{row.c}</TableCell>
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
          <img
            src="/tradingview.png" // 本地圖片
            alt="自訂圖示"
            style={{ width: 24, height: 24 }}
          />
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
      </TableCell>
    </TableRow>
  );
}
