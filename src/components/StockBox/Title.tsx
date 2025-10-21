import AddIcon from "@mui/icons-material/Add";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, Stack, Typography } from "@mui/material";
import useDetailWebviewWindow from "../../hooks/useDetailWebviewWindow";
import useStocksStore from "../../store/Stock.store";
import { StockStoreType } from "../../types";

export default function Title({
  stock,
  percent,
  lastPrice,
  canDelete = true,
  canAdd = false,
}: {
  stock: StockStoreType;
  percent: number;
  lastPrice: number;
  canDelete?: boolean;
  canAdd?: boolean;
}) {
  const { openDetailWindow } = useDetailWebviewWindow({
    id: stock.id,
    name: stock.name,
    group: stock.group,
  });

  const { remove, increase } = useStocksStore();

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
      {canDelete && (
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
      )}
      {canAdd && (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            increase(stock);
          }}
          sx={{ color: "#fff" }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      )}
    </Stack>
  );
}
