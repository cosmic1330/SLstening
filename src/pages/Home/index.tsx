import { Button } from "@mui/material";
import { Outlet } from "react-router";

function Home() {
  return (
    <main>
      <Button variant="contained" size="small">
        Open About
      </Button>
      <Outlet />
    </main>
  );
}
export default Home;
