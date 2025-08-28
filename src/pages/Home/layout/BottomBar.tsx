import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import BuildIcon from "@mui/icons-material/Build";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { AppBar, IconButton, Stack } from "@mui/material";
import { useNavigate } from "react-router";
import useAddWebviewWindow from "../../../hooks/useAddWebviewWindow";
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { supabase } from "../../../supabase";
import HomeIcon from '@mui/icons-material/Home';
export default function BottomBar() {
  const { openAddWindow } = useAddWebviewWindow();
  const navigate = useNavigate();
  return (
    <AppBar
      position="fixed"
      color="info"
      sx={{ top: "auto", bottom: 0, height: 60, display: "flex", justifyContent: "center" }}
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
            navigate("/dashboard/other");
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
            navigate("/dashboard/greenball");
          }}
        >
          <TrendingDownIcon fontSize="medium" />
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
