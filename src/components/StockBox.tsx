import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Button,
  Grid2,
  Box as MuiBox,
  styled,
  Tooltip,
  Typography,
} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import { emit } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { open } from "@tauri-apps/plugin-shell";
import useDeals from "../hooks/useDeals";
import useMaDeduction from "../hooks/useMaDeduction";
import useStocksStore, { StockField } from "../store/Stock.store";

const Box = styled(MuiBox)`
  background-color: #555;
  color: #fff;
  padding: 1rem;
  border-radius: 0.8rem;
  cursor: pointer;
`;
export default function StockBox({ stock }: { stock: StockField }) {
  const { remove } = useStocksStore();
  const { deals, name } = useDeals(stock.id);
  const {
    ma5_deduction_time,
    ma5_deduction_value,
    ma5_tomorrow_deduction_value,
    ma5_tomorrow_deduction_time,
    ma5,
    ma10,
  } = useMaDeduction(deals);
  const lastPrice = deals.length > 0 ? deals[deals.length - 1].c : 0;
  const prePirce = deals.length > 0 ? deals[deals.length - 2].c : 0;
  const url =
    stock.type === "上市"
      ? `https://tw.tradingview.com/chart?symbol=TWSE%3A${stock.id}`
      : `https://tw.tradingview.com/chart?symbol=TPEX%3A${stock.id}`;

  const openDetailWindow = async () => {
    // 检查是否已有相同标识的窗口
    let existingWindow = await WebviewWindow.getByLabel("detail");

    if (existingWindow) {
      try {
        // 如果窗口已存在，聚焦窗口并更新内容（如果需要）
        await existingWindow.setTitle(`${stock.id} ${name}`);
        // 动态更新 URL
        await emit("stock-added", { url: `/detail/${stock.id}` });
        existingWindow.setFocus();
      } catch (error) {
        console.error("Error interacting with existing window:", error);
      }
      return;
    } else {
      const webview = new WebviewWindow("detail", {
        title: stock.id + " " + name,
        url: `/detail/${stock.id}`,
      });
      webview.once("tauri://created", function () {});
      webview.once("tauri://error", function (e) {
        console.log(e);
      });
    }
  };

  return (
    <Box onClick={openDetailWindow} mt={2}>
      <Grid2 container alignItems="center">
        <Grid2 size={6} mb={1}>
          <Button
            variant="contained"
            size="small"
            color="info"
            onClick={async (e) => {
              e.stopPropagation();
              await open(url);
            }}
          >
            {stock.id} {name}
          </Button>
        </Grid2>
        <Grid2 size={6}>
          <Typography
            variant="h6"
            gutterBottom
            justifyContent="flex-end"
            alignItems="center"
            display="flex"
          >
            <AttachMoneyIcon />
            {lastPrice}
          </Typography>
        </Grid2>
      </Grid2>
      <Grid2 container alignItems="center" mb={1}>
        <Grid2 size={4}>
          <Typography
            variant="caption"
            gutterBottom
            component="div"
            color="#ddd"
          >
            ma5
          </Typography>
          <Typography
            variant="body2"
            color={lastPrice < ma5 ? "#e58282" : "#fff"}
            fontWeight="bold"
          >
            {ma5}
          </Typography>
        </Grid2>
        <Grid2 size={4}>
          <Typography
            variant="caption"
            gutterBottom
            component="div"
            color="#ddd"
          >
            Ded
          </Typography>
          <Tooltip title={ma5_deduction_time}>
            <Typography
              variant="body2"
              color={lastPrice < ma5_deduction_value ? "#e58282" : "#fff"}
              fontWeight="bold"
            >
              {ma5_deduction_value}
            </Typography>
          </Tooltip>
        </Grid2>
        <Grid2 size={4}>
          <Typography
            variant="caption"
            gutterBottom
            component="div"
            color="#ddd"
          >
            Tmr Ded
          </Typography>
          <Tooltip title={ma5_tomorrow_deduction_time}>
            <Typography
              variant="body2"
              color={
                lastPrice < ma5_tomorrow_deduction_value ? "#e58282" : "#fff"
              }
              fontWeight="bold"
            >
              {ma5_tomorrow_deduction_value}
            </Typography>
          </Tooltip>
        </Grid2>
      </Grid2>
      <Grid2 container alignItems="center">
        <Grid2 size={4}>
          <Typography
            variant="caption"
            gutterBottom
            component="div"
            color="#ddd"
            noWrap
          >
            Pre Low
          </Typography>
          <Typography
            variant="body2"
            color={
              deals.length > 0 && lastPrice < deals[deals.length - 2].l
                ? "#e58282"
                : "#fff"
            }
            fontWeight="bold"
          >
            {deals.length > 0 && deals[deals.length - 2].l}
          </Typography>
        </Grid2>
        <Grid2 size={4}>
          <Typography
            variant="caption"
            gutterBottom
            component="div"
            color="#ddd"
          >
            ma10
          </Typography>
          <Typography
            variant="body2"
            color={ma5 > ma10 && lastPrice < ma10 ? "#e58282" : "#fff"}
            fontWeight="bold"
          >
            {ma10}
          </Typography>
        </Grid2>
        <Grid2 size={2.5}>
          <Typography
            variant="caption"
            gutterBottom
            component="div"
            color="#ddd"
            noWrap
          >
            Persent
          </Typography>
          <Typography variant="body2" fontWeight="bold">
            {Math.round(((lastPrice - prePirce) / prePirce) * 100 * 100) / 100}%
          </Typography>
        </Grid2>
        <Grid2 size={1.5} textAlign={"center"}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              remove(stock.id);
            }}
            sx={{ border: "1px solid #fff", color: "#fff", marginLeft: 1 }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Grid2>
      </Grid2>
    </Box>
  );
}
