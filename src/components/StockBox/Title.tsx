import useDetailWebviewWindow from "../../hooks/useDetailWebviewWindow";
import useStocksStore, { StockField } from "../../store/Stock.store";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import DeleteIcon from "@mui/icons-material/Delete";
import { Stack, IconButton, Typography } from "@mui/material";

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
        <Typography variant="body2" color="#fff" onClick={openDetailWindow}>
          {lastPrice}
        </Typography>
      </Stack>
      <Typography
        variant="body2"
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
