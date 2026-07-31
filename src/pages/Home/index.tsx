import { Box } from "@mui/material";
import { Outlet } from "react-router";
import BottomBar from "./layout/BottomBar";
import { BOTTOM_BAR_CONTENT_CLEARANCE } from "./layout/constants";

function Home() {
  return (
    <Box sx={{ width: "100%", height: "100dvh", overflow: "hidden" }}>
      <Box
        component="main"
        sx={{
          width: "100%",
          height: `calc(100dvh - ${BOTTOM_BAR_CONTENT_CLEARANCE})`,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <Outlet />
      </Box>
      <BottomBar />
    </Box>
  );
}
export default Home;
