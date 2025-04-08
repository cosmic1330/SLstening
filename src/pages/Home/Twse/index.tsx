import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import { Grid2, Box as MuiBox, Stack, styled, Typography } from "@mui/material";
import useDetailWebviewWindow from "../../../hooks/useDetailWebviewWindow";
import useTwseDeals from "../../../hooks/useTwseDeals";
import HourlyChart from "./HourlyChart";
import TickChart from "./TickChart";

const Box = styled(MuiBox)`
  background-color: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 1);
  padding: 1rem;
  border-radius: 0.8rem;
  color: #fff;
`;
export default function TwseBox() {
  const { openDetailWindow } = useDetailWebviewWindow({
    id: "twse",
    name: "加權指數",
    group: "大盤",
  });
  const { deals, tickDeals } = useTwseDeals();
  return (
    <Box my={2} color="#fff" border="1px solid #fff">
      <Grid2 container alignItems="center" mb={1}>
        <Grid2 size={12}>{deals && <HourlyChart deals={deals} />}</Grid2>
        <Grid2 size={12}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="button">TWSE 加權</Typography>
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
        </Grid2>
        <Grid2 size={12}>
          {tickDeals && <TickChart tickDeals={tickDeals} />}
        </Grid2>
      </Grid2>
    </Box>
  );
}
