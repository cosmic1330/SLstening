import QueryStatsIcon from "@mui/icons-material/QueryStats";
import SettingsIcon from "@mui/icons-material/Settings";
import { Box, IconButton, styled } from "@mui/material";
import { useNavigate } from "react-router";

const GridItem = styled(Box)`
  grid-area: sidebar;
  height: 100%;
  width: 70px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  border-right: 1px solid rgba(0, 0, 0, 0.25);
  padding: 1rem 0;

  // mobile
  @media screen and (max-width: 600px) {
    width: 100%;
    height: 50px;
  }
`;
export default function SideBar() {
  const navigate = useNavigate();

  const toSetting = () => {
    navigate("/schoice/setting");
  };
  return (
    <GridItem>
      <QueryStatsIcon sx={{ fontSize: "50px" }} color="primary" />
      <IconButton onClick={toSetting}>
        <SettingsIcon />
      </IconButton>
    </GridItem>
  );
}
