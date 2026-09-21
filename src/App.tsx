import { lazy, Suspense } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { currentDestination, intendedDestination } from "./auth/navigation";
import "./App.css";
import { UserProvider, useUser } from "./context/UserContext";
import { appTheme } from "./theme";

const AuthenticatedRuntime = lazy(() => import("./layout/AuthenticatedRuntime"));
const Detail = lazy(() => import("./pages/Detail"));
const Home = lazy(() => import("./pages/Home"));
const Watchlist = lazy(() => import("./pages/Home/Watchlist"));
const Market = lazy(() => import("./pages/Home/Market"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Setting = lazy(() => import("./pages/Home/Setting"));

function RouteFallback() {
  const { t } = useTranslation();

  return (
    <Box role="status" aria-live="polite" sx={{ minHeight: 120, display: "grid", placeItems: "center", gap: 1 }}>
      <CircularProgress size={24} aria-hidden="true" />
      <Typography variant="body2">{t("app.loading")}</Typography>
    </Box>
  );
}

function LazyRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="/auth/login" replace />} />
      <Route element={<RedirectAuthenticated />}>
        <Route path="auth/login" element={<LazyRoute><Login /></LazyRoute>} />
        <Route path="auth/register" element={<LazyRoute><Register /></LazyRoute>} />
        <Route path="login" element={<Navigate to="/auth/login" replace />} />
        <Route path="register" element={<Navigate to="/auth/register" replace />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<LazyRoute><AuthenticatedRuntime /></LazyRoute>}>
          <Route path="add" element={<Navigate to="/dashboard" replace />} />
          <Route path="detail/:id" element={<LazyRoute><Detail /></LazyRoute>} />
          <Route path="dashboard" element={<LazyRoute><Home /></LazyRoute>}>
            <Route index element={<LazyRoute><Watchlist /></LazyRoute>} />
            <Route path="setting" element={<LazyRoute><Setting /></LazyRoute>} />
            <Route path="market" element={<LazyRoute><Market /></LazyRoute>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
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
  return (
    <ThemeProvider theme={appTheme}>
      <UserProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;
