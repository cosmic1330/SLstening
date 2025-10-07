import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { ToastContainer } from "react-toastify";
import "./App.css";
import { UserProvider } from "./context/UserContext";
import Add from "./pages/Add";
import Detail from "./pages/Detail/index";
import Home from "./pages/Home";
import TurnoverRate from "./pages/Home/TurnoverRate";
import List from "./pages/Home/List";
import RedBall from "./pages/Home/RedBall";
import Setting from "./pages/Home/Setting";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Schoice from "./pages/Schoice";
import Backtest from "./pages/Schoice/Backtest";
import Favorite from "./pages/Schoice/Favorite";
import Fundamental from "./pages/Schoice/Fundamental";
import PromptAdd from "./pages/Schoice/PromptAdd";
import PromptEdit from "./pages/Schoice/PromptEdit";
import PromptList from "./pages/Schoice/PromptList";
import Trash from "./pages/Schoice/Trash";
import useStocksStore from "./store/Stock.store";

function App() {
  const { reload } = useStocksStore();

  useEffect(() => {
    reload();
  }, []);

  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route index element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="add" element={<Add />} />
          <Route path="schoice" element={<Schoice />}>
            <Route index element={<PromptList />} />
            <Route path="favorite" element={<Favorite />} />
            <Route path="add" element={<PromptAdd />} />
            <Route path="edit/:id" element={<PromptEdit />} />
            <Route path="setting" element={<Setting />} />
            <Route path="trash" element={<Trash />} />
            <Route path="backtest" element={<Backtest />} />
            <Route path="fundamental" element={<Fundamental />} />
            <Route path="*" element={<Navigate to="/schoice" />} />
          </Route>
          <Route path="detail/:id" element={<Detail />} />
          <Route path="dashboard" element={<Home />}>
            <Route index element={<List />} />
            <Route path="setting" element={<Setting />} />
            <Route path="redball" element={<RedBall />} />
            <Route path="turnoverRate" element={<TurnoverRate />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Route>
        </Routes>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick={false}
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;
