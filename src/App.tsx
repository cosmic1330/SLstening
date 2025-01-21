import { BrowserRouter, Route, Routes } from "react-router";
import "./App.css";
import Add from "./pages/Add";
import Detail from "./pages/Detail";
import Close from "./pages/Detail/Close";
import Obv from "./pages/Detail/Obv";
import Home from "./pages/Home";
import List from "./pages/Home/List";
import Other from "./pages/Home/Other";
import Login from "./pages/Login";
import useStocksStore from "./store/Stock.store";
import { useEffect } from "react";
import Schoice from "./pages/Schoice";

function App() {
  const { reload } = useStocksStore();

  useEffect(() => {
    reload();
    console.log("reload");
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Login />} />
        <Route path="add" element={<Add />} />
        <Route path="schoice" element={<Schoice />} />
        <Route path="detail/:id" element={<Detail />} />
        <Route path="dashboard" element={<Home />}>
          <Route index element={<List />} />
          <Route path="other" element={<Other />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
