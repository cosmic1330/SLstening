import { Box, Stack, styled } from "@mui/material";
import Breadcrumb from "./Breadcrumb";
import FilterStocks from "./FilterStocks";
import LatestDate from "./LatestDate";
import MarketAnalysis from "./MarketAnalysis";
import RollBack from "./RollBack";
import UpdateDeals from "./UpdateDeals";

const GridItem = styled(Box)`
  grid-area: header;
  height: 70px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.25);

  // mobile
  @media screen and (max-width: 600px) {
    width: 100%;
  }
`;
export default function Header() {
  return (
    <GridItem>
      <Stack direction="row" spacing={2} alignItems="center">
        <Breadcrumb />
        <MarketAnalysis />
      </Stack>
      <Stack direction="row" spacing={2} alignItems="center">
        <RollBack />
        <FilterStocks />
        <LatestDate />
        <UpdateDeals />
      </Stack>
    </GridItem>
  );
}
