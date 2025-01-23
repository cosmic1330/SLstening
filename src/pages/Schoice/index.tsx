import { styled } from "@mui/material";
import { DatabaseContext } from "../../context/DatabaseContext";
import useDatabase from "../../hooks/useDatabase";
import Header from "./layout/Header";
import SideBar from "./layout/sidebar";
import LatestDate from "./parts/LatestDate";
import TestList from "./parts/TestList";
import UpdateDeals from "./parts/UpdateDeals";

const Main = styled("main")`
  width: 100%;
  height: 100vh;
  display: grid;
  grid-template-columns: auto 1fr 1fr;
  grid-template-rows: auto 1fr 1fr;
  grid-template-areas:
    "sidebar header header"
    "sidebar  page   page "
    "sidebar  page   page ";

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

const Schoice = () => {
  const db = useDatabase();

  return (
    <DatabaseContext.Provider value={{ db }}>
      <Main>
        <SideBar />
        <Header />
        <TestList />
      </Main>
    </DatabaseContext.Provider>
  );
};
export default Schoice;
