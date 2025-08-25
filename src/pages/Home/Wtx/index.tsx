import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import { Grid, Box as MuiBox, Stack, styled, Typography } from "@mui/material";
import useDetailWebviewWindow from "../../../hooks/useDetailWebviewWindow";
import useWtxDeals from "../../../hooks/useWtxDeals";
import { FutureIds } from "../../../types";
import MakChart from "../CommonChart/MakChart";

const Box = styled(MuiBox)`
  background-color: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 1);
  padding: 1rem;
  border-radius: 0.8rem;
  color: #fff;
`;

export default function WtxBox() {
  const { openDetailWindow } = useDetailWebviewWindow({
    id: FutureIds.WTX,
    name: "台指期近一",
    group: "期貨",
  });
  const { deals } = useWtxDeals();

  return (
    <Box my={2} color="#fff" border="1px solid #fff">
      <Grid container alignItems="center" mb={1}>
        <Grid size={12}>{deals && <MakChart deals={deals} />}</Grid>
        <Grid size={12}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="button">台指期近一</Typography>
            <Stack
              direction="row"
              alignItems="center"
              onClick={openDetailWindow}
              sx={{ cursor: "pointer" }}
            >
              <AttachMoneyIcon fontSize="small" />
              <Typography variant="subtitle1" color="#fff">
                {deals && deals.price}
              </Typography>
            </Stack>
            <Typography
              variant="subtitle1"
              color={
                deals && deals.change > 0
                  ? "#ff0000"
                  : deals && deals.change < 0
                  ? "#00ff00"
                  : "#fff"
              }
            >
              {deals && deals.change}
            </Typography>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
