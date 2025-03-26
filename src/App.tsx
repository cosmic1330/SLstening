import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { ToastContainer } from "react-toastify";
import "./App.css";
import Add from "./pages/Add";
import Detail from "./pages/Detail";
import Home from "./pages/Home";
import List from "./pages/Home/List";
import Other from "./pages/Home/Other";
import Login from "./pages/Login";
import Schoice from "./pages/Schoice";
import PromptAdd from "./pages/Schoice/PromptAdd";
import PromptEdit from "./pages/Schoice/PromptEdit";
import PromptList from "./pages/Schoice/PromptList";
import Setting from "./pages/Schoice/Setting";
import useStocksStore from "./store/Stock.store";
import Register from "./pages/Register";

function App() {
  const { reload } = useStocksStore();

  useEffect(() => {
    reload();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="add" element={<Add />} />
        <Route path="schoice" element={<Schoice />}>
          <Route index element={<PromptList />} />
          <Route path="add" element={<PromptAdd />} />
          <Route path="edit/:id" element={<PromptEdit />} />
          <Route path="setting" element={<Setting />} />
          <Route path="*" element={<Navigate to="/schoice" />} />
        </Route>
        <Route path="detail/:id" element={<Detail />} />
        <Route path="dashboard" element={<Home />}>
          <Route index element={<List />} />
          <Route path="other" element={<Other />} />
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
  );
}

export default App;
