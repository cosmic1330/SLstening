import QueryStatsIcon from "@mui/icons-material/QueryStats";
import SettingsIcon from "@mui/icons-material/Settings";
import { Box, IconButton, styled, Tooltip } from "@mui/material";
import { useNavigate } from "react-router";
import InsertRuleButton from "../../../components/InsertRuleButton";
import LightModeIcon from "@mui/icons-material/LightMode";
import useSchoiceStore from "../../../store/Schoice.store";
import DarkModeIcon from "@mui/icons-material/DarkMode";

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
  const { theme, changeTheme } = useSchoiceStore();

  const toSetting = () => {
    navigate("/schoice/setting");
  };

  const onThemeChange = () => {
    if (theme === "light") changeTheme("dark");
    else changeTheme("light");
  };

  return (
    <GridItem>
      <QueryStatsIcon sx={{ fontSize: "50px" }} color="primary" />
      <Box>
        <Tooltip title="切換主題" arrow placement="right">
          <IconButton onClick={onThemeChange}>
            {theme === "light" ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>
        <InsertRuleButton />
        <Tooltip title="設定" arrow placement="right">
          <IconButton onClick={toSetting}>
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </GridItem>
  );
}
