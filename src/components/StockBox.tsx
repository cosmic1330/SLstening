import {
  Grid2,
  Box as MuiBox,
  styled,
  Typography,
} from "@mui/material";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import useDeals from "../hooks/useDeals";
import useMa5Deduction from "../hooks/useMa5Deduction";
import useStocksStore from "../store/Stock.store";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";

const Box = styled(MuiBox)`
  background-color: #555;
  color: #fff;
  padding: 1rem;
  border-radius: 0.8rem;
  cursor: pointer;
`;
export default function StockBox({ id }: { id: string }) {
  const { remove } = useStocksStore();
  const { deals, name } = useDeals(id);
  const { ma5_deduction_time, ma5_deduction_value, ma5 } =
    useMa5Deduction(deals);
  const lastPrice = deals.length > 0 ? deals[deals.length - 1].c : 0;

  const openDetailWindow = async () => {
    const webview = new WebviewWindow("detail", {
      title: id + " " + name,
      url: `/detail/${id}`,
    });
    webview.once("tauri://created", function () {});
    webview.once("tauri://error", function (e) {
      console.log(e);
    });
  };

  return (
    <Box onClick={openDetailWindow} mt={2}>
      <Grid2 container alignItems="center">
        <Grid2 size={6}>
          <Typography variant="body1" gutterBottom>
            [{id} {name}]
          </Typography>
        </Grid2>
        <Grid2 size={6}>
          <Typography variant="h6" gutterBottom textAlign="right">
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
            color={lastPrice < ma5 ? "error" : "#fff"}
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
            deduction
          </Typography>
          <Typography
            variant="body2"
            color={lastPrice < ma5_deduction_value ? "error" : "#fff"}
            fontWeight="bold"
          >
            {ma5_deduction_value}
          </Typography>
        </Grid2>
        <Grid2 size={4}>
          <Typography
            variant="caption"
            gutterBottom
            component="div"
            color="#ddd"
          >
            deduction_date
          </Typography>
          <Typography
            variant="body2"
            color={lastPrice < ma5_deduction_value ? "error" : "#fff"}
            fontWeight="bold"
          >
            {ma5_deduction_time}
          </Typography>
        </Grid2>
      </Grid2>
      <Grid2 container alignItems="center">
        <Grid2 size={4}>
          <Typography
            variant="caption"
            gutterBottom
            component="div"
            color="#ddd"
          >
            pre_low
          </Typography>
          <Typography
            variant="body2"
            color={
              deals.length > 0 && lastPrice < deals[deals.length - 2].l
                ? "error"
                : "#fff"
            }
            fontWeight="bold"
          >
            {deals.length > 0 && deals[deals.length - 2].l}
          </Typography>
        </Grid2>
        <Grid2 size={4}></Grid2>
        <Grid2 size={4} textAlign="center">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              remove(id);
            }}
            sx={{ border: "1px solid #fff", color: "#fff" }}
          >
            <DeleteIcon />
          </IconButton>
        </Grid2>
      </Grid2>
    </Box>
  );
}
