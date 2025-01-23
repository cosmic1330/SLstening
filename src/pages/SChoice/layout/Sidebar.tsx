import QueryStatsIcon from "@mui/icons-material/QueryStats";
import { Box, styled } from "@mui/material";
const GridItem = styled(Box)`
  grid-area: sidebar;
  height: 100%;
  width: 70px;
  box-shadow: 2px 0px 4px rgba(0, 0, 0, 0.25);
  display: flex;
  justify-content: center;
  padding: 1rem 0;

  // mobile
  @media screen and (max-width: 600px) {
    width: 100%;
    height: 50px;
  }
`;
export default function SideBar() {
  return (
    <GridItem>
      <QueryStatsIcon sx={{ fontSize: "50px" }} color="primary"/>
    </GridItem>
  );
}
