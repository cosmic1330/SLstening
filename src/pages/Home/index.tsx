import { Container } from "@mui/material";
import { Outlet } from "react-router";
import SpeedDial from "../../components/SpeedDial";

function Home() {
  return (
    <Container component="main">
      <Outlet />
      <SpeedDial />
    </Container>
  );
}
export default Home;
