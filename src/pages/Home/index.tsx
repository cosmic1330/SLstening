import { Box } from "@mui/material";
import { Outlet } from "react-router";
import BottomBar from "./layout/BottomBar";

function Home() {
  return (
    <Box>
      <Outlet />
      <BottomBar />
    </Box>
  );
}
export default Home;
