
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import BuildIcon from "@mui/icons-material/Build";
import CategoryIcon from '@mui/icons-material/Category';
import HomeIcon from "@mui/icons-material/Home";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { Box, IconButton,  styled, Tooltip } from "@mui/material"; // Import Tooltip
import { useLocation, useNavigate } from "react-router";
import useAddWebviewWindow from "../../../hooks/useAddWebviewWindow";

import useUIStore from "../../../store/UI.store";

const WoodenDock = styled(Box, {
  shouldForwardProp: (prop) => prop !== "visible",
})<{ visible?: boolean }>(({ visible }) => ({
  position: "fixed",
  bottom: 12,
  left: "50%",
  transform: visible 
    ? "translateX(-50%)" 
    : "translateX(-50%) translateY(120px)", // Slide out of view
  width: "92%",
  maxWidth: "460px",
  height: 60,
  background: "#3D5A45",
  borderRadius: "16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0 16px",
  zIndex: 1000,
  opacity: visible ? 1 : 0,
  pointerEvents: visible ? "auto" : "none", // Prevent accidental clicks when hidden
  transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1)", // Bouncy return
}));

const NavButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== "active",
})<{ active?: boolean }>(({ active }) => ({
  color: active ? "#F1E5AC" : "rgba(241, 229, 172, 0.4)",
  transition: "all 0.2s ease",
  padding: "8px",
  
  "&:hover": {
    background: "rgba(255, 255, 255, 0.05)",
    color: active ? "#F1E5AC" : "#F1E5AC",
  },
  
  "& .MuiSvgIcon-root": {
    fontSize: "1.4rem",
    filter: active ? "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" : "none",
  }
}));

const CenterFab = styled(IconButton)(() => ({
  position: "absolute",
  top: -20,
  left: "50%",
  transform: "translateX(-50%)",
  background: "#D2691E",
  color: "#F1E5AC",
  padding: 0, 
  width: 48,
  height: 48,
  boxShadow: "0 4px 0 #8B4513",
  border: "2px solid #2D4A35",
  transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
  
  "&:hover": {
    background: "#E67E22",
    transform: "translateX(-50%) translateY(-2px)",
    boxShadow: "0 6px 0 #8B4513",
  },

  "& .MuiSvgIcon-root": {
      fontSize: "2.4rem",
  }
}));

export default function BottomBar() {
  const { openAddWindow } = useAddWebviewWindow();
  const navigate = useNavigate();
  const location = useLocation();
  const { isBottomBarVisible } = useUIStore();

  const isActive = (path: string) => {
    if (path === "/dashboard" && location.pathname === "/dashboard") return true;
    if (path !== "/dashboard" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <WoodenDock visible={isBottomBarVisible}>
      <Tooltip title="首頁" arrow>
        <NavButton 
            active={isActive("/dashboard")}
            onClick={() => navigate("/dashboard")}
        >
            <HomeIcon />
        </NavButton>
      </Tooltip>

      <Tooltip title="設定" arrow>
        <NavButton 
            active={isActive("/dashboard/setting")}
            onClick={() => navigate("/dashboard/setting")}
        >
            <BuildIcon />
        </NavButton>
      </Tooltip>

      {/* Spacer for Center FAB */}
      <Box sx={{ width: 40 }} />

      <CenterFab onClick={openAddWindow}>
        <AddCircleRoundedIcon />
      </CenterFab>

      <Tooltip title="系統推薦股" arrow>
        <NavButton 
            active={isActive("/dashboard/redball")}
            onClick={() => navigate("/dashboard/redball")}
        >
            <TrendingUpIcon />
        </NavButton>
      </Tooltip>
      
      <Tooltip title="分類" arrow>
         <NavButton 
            active={isActive("/dashboard/category")}
            onClick={() => navigate("/dashboard/category")}
        >
            <CategoryIcon />
        </NavButton>
      </Tooltip>
    </WoodenDock>
  );
}
