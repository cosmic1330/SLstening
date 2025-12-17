import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { ToastContainer } from "react-toastify";
import "./App.css";
import { UserProvider } from "./context/UserContext";
import Add from "./pages/Add";
import Detail from "./pages/Detail/index";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import useStocksStore from "./store/Stock.store";

// 懶加載組件
const TurnoverRate = lazy(() => import("./pages/Home/TurnoverRate"));
const List = lazy(() => import("./pages/Home/List"));
const RedBall = lazy(() => import("./pages/Home/RedBall"));
const Setting = lazy(() => import("./pages/Home/Setting"));

function App() {``
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
            <Route
              index
              element={
                <Suspense fallback={<div>載入中...</div>}>
                  <List />
                </Suspense>
              }
            />
            <Route
              path="setting"
              element={
                <Suspense fallback={<div>載入中...</div>}>
                  <Setting />
                </Suspense>
              }
            />
            <Route
              path="redball"
              element={
                <Suspense fallback={<div>載入中...</div>}>
                  <RedBall />
                </Suspense>
              }
            />
            <Route
              path="turnoverRate"
              element={
                <Suspense fallback={<div>載入中...</div>}>
                  <TurnoverRate />
                </Suspense>
              }
            />
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
