import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { ToastContainer } from "react-toastify";
import "./App.css";
import { UserProvider } from "./context/UserContext";
import Add from "./pages/Add";
import Detail from "./pages/Detail/index";
import Home from "./pages/Home";
import List from "./pages/Home/List";
import Other from "./pages/Home/Other";
import Login from "./pages/Login";
import Register from "./pages/Register";
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
    </UserProvider>
  );
}

export default App;
