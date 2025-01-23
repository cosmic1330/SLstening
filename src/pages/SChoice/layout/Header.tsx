import { Box, Stack, styled } from "@mui/material";
import LatestDate from "../parts/LatestDate";
import UpdateDeals from "../parts/UpdateDeals";
import Breadcrumb from "../parts/Breadcrumb";

const GridItem = styled(Box)`
  grid-area: header;
  height: 70px;
  width: 100%;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;

  // mobile
  @media screen and (max-width: 600px) {
    width: 100%;
  }
`;
export default function Header() {
  return (
    <GridItem>
      <Stack><Breadcrumb/></Stack>
      <Stack
        direction="row"
        spacing={3}
        alignItems="center"
      >
        <LatestDate />
        <UpdateDeals />
      </Stack>
    </GridItem>
  );
}
