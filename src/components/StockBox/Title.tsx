import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, Stack, Typography } from "@mui/material";
import useDetailWebviewWindow from "../../hooks/useDetailWebviewWindow";
import useStocksStore, { StockField } from "../../store/Stock.store";

export default function Title({
  stock,
  percent,
  lastPrice,
}: {
  stock: StockField;
  percent: number;
  lastPrice: number;
}) {
  const { openDetailWindow } = useDetailWebviewWindow({
    id: stock.id,
    name: stock.name,
    group: stock.group,
  });

  const { remove } = useStocksStore();

  return (
    <Stack
      spacing={1}
      direction="row"
      justifyContent="flex-end"
      alignItems="center"
    >
      <Stack direction="row" justifyContent="flex-end" alignItems="center">
        <AttachMoneyIcon fontSize="small" />
        <Typography
          variant="subtitle1"
          color="#fff"
          onClick={openDetailWindow}
          sx={{ cursor: "pointer" }}
        >
          {lastPrice}
        </Typography>
      </Stack>
      <Typography
        variant="subtitle1"
        color={percent > 0 ? "#ff0000" : percent < 0 ? "#00ff00" : "#fff"}
      >
        {percent}%
      </Typography>
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
  );
}
