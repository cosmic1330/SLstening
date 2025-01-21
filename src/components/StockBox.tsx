import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Button,
  Grid2,
  Box as MuiBox,
  Stack,
  styled,
  Tooltip,
  Typography,
} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import { open } from "@tauri-apps/plugin-shell";
import useDeals from "../hooks/useDeals";
import useMaDeduction from "../hooks/useMaDeduction";
import useStocksStore, { StockField } from "../store/Stock.store";
import useDetailWebviewWindow from "../hooks/useDetailWebviewWindow";

const Box = styled(MuiBox)`
  background-color: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 1);
  padding: 1rem;
  border-radius: 0.8rem;
  color: #fff;
  /* backdrop-filter: blur(5px); Gaussian blur effect */
`;
export default function StockBox({ stock }: { stock: StockField }) {
  const { remove } = useStocksStore();
  const { deals, name } = useDeals(stock.id);
  const { openDetailWindow } = useDetailWebviewWindow({
    id: stock.id,
    name: stock.name,
    group: stock.group,
  });
  const {
    ma5,
    ma5_deduction_time,
    ma5_deduction_value,
    ma5_tomorrow_deduction_value,
    ma5_tomorrow_deduction_time,
    ma10,
    ma10_deduction_time,
    ma10_deduction_value,
    ma10_tomorrow_deduction_value,
    ma10_tomorrow_deduction_time,
  } = useMaDeduction(deals);
  const lastPrice = deals.length > 0 ? deals[deals.length - 1].c : 0;
  const prePirce = deals.length > 0 ? deals[deals.length - 2].c : 0;
  const url =
    stock.type === "上市"
      ? `https://tw.tradingview.com/chart?symbol=TWSE%3A${stock.id}`
      : `https://tw.tradingview.com/chart?symbol=TPEX%3A${stock.id}`;


  return (
    <Box mt={2} sx={{ border: "1px solid #fff", color: "#fff" }}>
      <Grid2 container alignItems="center" mb={1}>
        <Grid2 size={6}>
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
          <Stack spacing={0.5} direction="row" justifyContent="flex-end">
            <Button
              onClick={openDetailWindow}
              sx={{ color: "#fff", lineHeight: 1, fontSize: 21 }}
            >
              <AttachMoneyIcon />
              {lastPrice}
            </Button>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                remove(stock.id);
              }}
              sx={{ color: "#fff" }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Grid2>
      </Grid2>
      <Grid2 container alignItems="center" mb={1}>
        <Grid2 size={3}>
          <Typography
            variant="body2"
            gutterBottom
            component="div"
            color="#fff"
            textAlign="center"
          >
            ma5
          </Typography>
          <Typography
            variant="body2"
            color={lastPrice < ma5 ? "#e58282" : "#fff"}
            fontWeight="bold"
            textAlign="center"
          >
            {ma5}
          </Typography>
        </Grid2>
        <Grid2 size={3}>
          <Typography
            variant="body2"
            gutterBottom
            component="div"
            color="#fff"
            textAlign="center"
          >
            5扣抵
          </Typography>
          <Tooltip title={ma5_deduction_time}>
            <Typography
              variant="body2"
              color={lastPrice < ma5_deduction_value ? "#e58282" : "#fff"}
              fontWeight="bold"
              textAlign="center"
            >
              {ma5_deduction_value}
            </Typography>
          </Tooltip>
        </Grid2>
        <Grid2 size={3.5}>
          <Typography
            variant="body2"
            gutterBottom
            component="div"
            color="#fff"
            textAlign="center"
          >
            明日5扣抵
          </Typography>
          <Tooltip title={ma5_tomorrow_deduction_time}>
            <Typography
              variant="body2"
              color={
                lastPrice < ma5_tomorrow_deduction_value ? "#e58282" : "#fff"
              }
              fontWeight="bold"
              textAlign="center"
            >
              {ma5_tomorrow_deduction_value}
            </Typography>
          </Tooltip>
        </Grid2>
        <Grid2 size={2.5}>
          <Typography
            variant="body2"
            gutterBottom
            component="div"
            color="#fff"
            textAlign="center"
            noWrap
          >
            前低
          </Typography>
          <Typography
            variant="body2"
            color={
              deals.length > 0 && lastPrice < deals[deals.length - 2].l
                ? "#e58282"
                : "#fff"
            }
            fontWeight="bold"
            textAlign="center"
          >
            {deals.length > 0 && deals[deals.length - 2].l}
          </Typography>
        </Grid2>
      </Grid2>
      <Grid2 container alignItems="center">
        <Grid2 size={3}>
          <Typography
            variant="body2"
            gutterBottom
            component="div"
            color="#fff"
            textAlign="center"
          >
            ma10
          </Typography>
          <Typography
            variant="body2"
            color={ma5 > ma10 && lastPrice < ma10 ? "#e58282" : "#fff"}
            fontWeight="bold"
            textAlign="center"
          >
            {ma10}
          </Typography>
        </Grid2>
        <Grid2 size={3}>
          <Typography
            variant="body2"
            gutterBottom
            component="div"
            color="#fff"
            textAlign="center"
          >
            10扣抵
          </Typography>
          <Tooltip title={ma10_deduction_time}>
            <Typography
              variant="body2"
              color={lastPrice < ma10_deduction_value ? "#e58282" : "#fff"}
              fontWeight="bold"
              textAlign="center"
            >
              {ma10_deduction_value}
            </Typography>
          </Tooltip>
        </Grid2>
        <Grid2 size={3.5}>
          <Typography
            variant="body2"
            gutterBottom
            component="div"
            color="#fff"
            textAlign="center"
          >
            明日10扣抵
          </Typography>
          <Tooltip title={ma10_tomorrow_deduction_time}>
            <Typography
              variant="body2"
              color={
                lastPrice < ma10_tomorrow_deduction_value ? "#e58282" : "#fff"
              }
              fontWeight="bold"
              textAlign="center"
            >
              {ma10_tomorrow_deduction_value}
            </Typography>
          </Tooltip>
        </Grid2>
        <Grid2 size={2.5} textAlign="center">
          <Typography
            variant="body2"
            gutterBottom
            component="div"
            color="#fff"
            textAlign="center"
            noWrap
          >
            漲跌
          </Typography>
          <Typography variant="body2" fontWeight="bold" textAlign="center">
            {Math.round(((lastPrice - prePirce) / prePirce) * 100 * 100) / 100}%
          </Typography>
        </Grid2>
      </Grid2>
    </Box>
  );
}
