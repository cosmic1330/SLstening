import { lazy, Suspense, useEffect } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { currentDestination, intendedDestination } from "./auth/navigation";
import { ToastContainer } from "react-toastify";
import "./App.css";
import DebugInfo from "./components/DebugInfo";
import { UserProvider, useUser } from "./context/UserContext";
import Add from "./pages/Add";
import Detail from "./pages/Detail/index";
import Home from "./pages/Home";
import Category from "./pages/Home/Category";
import Login from "./pages/Login";
import Register from "./pages/Register";
import useStocksStore from "./store/Stock.store";
import useDebugStore from "./store/debug.store";
import useMarketWatcher from "./hooks/useMarketWatcher";
import { appTheme } from "./theme";

// 懶加載組件
const List = lazy(() => import("./pages/Home/List"));
const RedBall = lazy(() => import("./pages/Home/RedBall"));
const Setting = lazy(() => import("./pages/Home/Setting"));

export function AppRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="/auth/login" replace />} />
      <Route element={<RedirectAuthenticated />}>
        <Route path="auth/login" element={<Login />} />
        <Route path="auth/register" element={<Register />} />
        <Route path="login" element={<Navigate to="/auth/login" replace />} />
        <Route path="register" element={<Navigate to="/auth/register" replace />} />
      </Route>
      <Route element={<RequireAuth />}>
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
          path="category"
          element={
            <Suspense fallback={<div>載入中...</div>}>
              <Category />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" />} />
        </Route>
      </Route>
    </Routes>
  );
}

export function RequireAuth() {
  const { isLoading, session } = useUser();
  const location = useLocation();
  if (isLoading) return null;
  return session ? <Outlet /> : <Navigate to="/auth/login" replace state={{ from: currentDestination(location) }} />;
}

export function RedirectAuthenticated() {
  const { isLoading, session } = useUser();
  const location = useLocation();
  if (isLoading) return null;
  return session ? <Navigate to={intendedDestination(location.state)} replace /> : <Outlet />;
}

function App() {
  const { reload } = useStocksStore();
  
  // 啟動全域市場資料監聽
  useMarketWatcher();

  useEffect(() => {
    reload();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        useDebugStore.getState().toggleVisibility();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <ThemeProvider theme={appTheme}>
      <UserProvider>
        <BrowserRouter>
          <AppRoutes />
          <DebugInfo />
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
    </ThemeProvider>
  );
}

export default App;
