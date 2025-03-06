import { styled } from "@mui/material";
import { useEffect } from "react";
import { Outlet } from "react-router";
import { DatabaseContext } from "../../context/DatabaseContext";
import useDatabase from "../../hooks/useDatabase";
import useSchoiceStore from "../../store/Schoice.store";
import Header from "./layout/Header";
import SideBar from "./layout/Sidebar";
import useDatabaseDates from "../../hooks/useDatabaseDates";

const Main = styled("main")`
  width: 100%;
  height: 100vh;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    "sidebar header "
    "sidebar  page  ";

  // mobile
  @media screen and (max-width: 600px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 1fr;
    grid-template-areas:
      "sidebar"
      "header"
      "page"
      "page";
  }
`;

function Schoice() {
  const db = useDatabase();
  const { reload } = useSchoiceStore();
  const dates = useDatabaseDates(db);

  useEffect(() => {
    reload();
  }, []);

  return (
    <DatabaseContext.Provider value={{ db, dates }}>
      <Main>
        <SideBar />
        <Header />
        <Outlet />
      </Main>
    </DatabaseContext.Provider>
  );
}
export default Schoice;
