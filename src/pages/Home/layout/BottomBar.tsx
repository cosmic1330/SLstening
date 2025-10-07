import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import BuildIcon from "@mui/icons-material/Build";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import HomeIcon from "@mui/icons-material/Home";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { AppBar, IconButton, Stack } from "@mui/material";
import { useNavigate } from "react-router";
import useAddWebviewWindow from "../../../hooks/useAddWebviewWindow";
import { supabase } from "../../../supabase";
export default function BottomBar() {
  const { openAddWindow } = useAddWebviewWindow();
  const navigate = useNavigate();
  return (
    <AppBar
      position="fixed"
      color="info"
      sx={{
        top: "auto",
        bottom: 0,
        height: 60,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <IconButton
        onClick={openAddWindow}
        color="inherit"
        size="large"
        sx={{
          position: "absolute",
          right: "50%",
          transform: "translateX(50%)",
          top: "-50%",
        }}
      >
        <AddCircleRoundedIcon fontSize="large" />
      </IconButton>
      <Stack
        direction="row"
        justifyContent="space-around"
        alignContent={"center"}
        spacing={1}
      >
        <IconButton
          size="medium"
          color="inherit"
          onClick={() => {
            navigate("/dashboard");
          }}
        >
          <HomeIcon fontSize="medium" />
        </IconButton>
        <IconButton
          size="medium"
          color="inherit"
          onClick={() => {
            navigate("/dashboard/setting");
          }}
        >
          <BuildIcon fontSize="medium" />
        </IconButton>
        <IconButton
          size="medium"
          color="inherit"
          onClick={() => {
            navigate("/dashboard/redball");
          }}
        >
          <TrendingUpIcon fontSize="medium" />
        </IconButton>

        <IconButton
          size="medium"
          color="inherit"
          onClick={() => {
            navigate("/dashboard/turnoverRate");
          }}
        >
          <CurrencyExchangeIcon fontSize="medium" />
        </IconButton>
        <IconButton
          size="medium"
          color="inherit"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate("/");
          }}
        >
          <LogoutRoundedIcon fontSize="medium" />
        </IconButton>
      </Stack>
    </AppBar>
  );
}
