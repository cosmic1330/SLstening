import PetsIcon from "@mui/icons-material/Pets";
import { Grid2, Stack, Typography } from "@mui/material";
import useSchoiceStore from "../../../store/Schoice.store";
import useStocksStore from "../../../store/Stock.store";

export default function LatestDate() {
  const { menu } = useStocksStore();
  const { dataCount, sqliteUpdateDate } = useSchoiceStore();

  return (
    <Stack>
      <Grid2 container spacing={2}>
        <Grid2 size={6}>
          <Typography variant="body1">Data Date:</Typography>
        </Grid2>
        <Grid2 size={6}>
          <Typography variant="body1" textAlign="right">
            {sqliteUpdateDate}
          </Typography>
        </Grid2>
      </Grid2>
      <Grid2 container spacing={2}>
        <Grid2>
          <Typography variant="body1">Stock Counts:</Typography>
        </Grid2>
        <Grid2 display="flex" flexWrap="nowrap">
          <PetsIcon fontSize="small" />
          <Typography variant="body1" textAlign="right">
            {menu.length} / {dataCount}
          </Typography>
        </Grid2>
      </Grid2>
    </Stack>
  );
}
