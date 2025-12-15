import AddIcon from "@mui/icons-material/Add";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton as MuiIconButton, Stack, Typography, styled } from "@mui/material";
import useDetailWebviewWindow from "../../hooks/useDetailWebviewWindow";
import useStocksStore from "../../store/Stock.store";
import { StockStoreType } from "../../types";

const IconButton = styled(MuiIconButton)(() => ({
  color: "rgba(255, 255, 255, 0.7)",
  padding: 4,
  transition: "all 0.2s",
  "&:hover": {
    color: "white",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
}));

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
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <AttachMoneyIcon sx={{ fontSize: "1rem", color: "rgba(255,255,255,0.5)" }} />
        <Typography
          variant="subtitle1"
          fontWeight="700"
          color="#fff"
          onClick={openDetailWindow}
          sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
        >
          {lastPrice}
        </Typography>
      </Stack>
      
      <Typography
        variant="subtitle1"
        fontWeight="700"
        sx={{
            color: percent > 0 ? "#ff6b6b" : percent < 0 ? "#4caf50" : "#fff",
            backgroundColor: percent > 0 ? "rgba(255, 107, 107, 0.1)" : percent < 0 ? "rgba(76, 175, 80, 0.1)" : "transparent",
            padding: "2px 6px",
            borderRadius: "4px",
        }}
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
        >
          <AddIcon fontSize="small" />
        </IconButton>
      )}
    </Stack>
  );
}
