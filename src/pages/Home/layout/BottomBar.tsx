
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import BuildIcon from "@mui/icons-material/Build";
import CategoryIcon from '@mui/icons-material/Category';
import HomeIcon from "@mui/icons-material/Home";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { Box, IconButton,  styled, Tooltip } from "@mui/material"; // Import Tooltip
import { useLocation, useNavigate } from "react-router";
import useAddWebviewWindow from "../../../hooks/useAddWebviewWindow";
import { primitiveTokens, semanticTokens } from "../../../theme";

import useUIStore from "../../../store/UI.store";
import { BOTTOM_BAR_BOTTOM, BOTTOM_BAR_HEIGHT } from "./constants";

const WoodenDock = styled(Box, {
  shouldForwardProp: (prop) => prop !== "visible",
})<{ visible?: boolean }>(({ visible }) => ({
  position: "fixed",
  bottom: BOTTOM_BAR_BOTTOM,
  left: "50%",
  transform: visible 
    ? "translateX(-50%)" 
    : "translateX(-50%) translateY(120px)", // Slide out of view
  width: "92%",
  maxWidth: "460px",
  height: BOTTOM_BAR_HEIGHT,
  background: semanticTokens.app.primary,
  borderRadius: primitiveTokens.radius.lg,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0 16px",
  zIndex: primitiveTokens.layer.navigation,
  opacity: visible ? 1 : 0,
  pointerEvents: visible ? "auto" : "none", // Prevent accidental clicks when hidden
  boxShadow: primitiveTokens.shadow.dock,
  transition: [
    `transform ${primitiveTokens.motion.duration.deliberate}ms ${primitiveTokens.motion.easing.spring}`,
    `opacity ${primitiveTokens.motion.duration.standard}ms ${primitiveTokens.motion.easing.standard}`,
  ].join(", "),
  "@media (prefers-reduced-motion: reduce)": { transition: "none" },
}));

const NavButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== "active",
})<{ active?: boolean }>(({ active }) => ({
  color: active ? semanticTokens.app.onPrimary : semanticTokens.app.onPrimaryMuted,
  transition: [
    `color ${primitiveTokens.motion.duration.standard}ms ${primitiveTokens.motion.easing.standard}`,
    `background-color ${primitiveTokens.motion.duration.standard}ms ${primitiveTokens.motion.easing.standard}`,
  ].join(", "),
  padding: "8px",
  
  "&:hover": {
    background: semanticTokens.app.stateHover,
    color: semanticTokens.app.onPrimary,
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
  background: semanticTokens.app.accent,
  color: semanticTokens.app.onPrimary,
  padding: 0, 
  width: 48,
  height: 48,
  boxShadow: `0 4px 0 ${primitiveTokens.color.wood}`,
  border: `2px solid ${semanticTokens.app.primaryStrong}`,
  transition: [
    `transform ${primitiveTokens.motion.duration.standard}ms ${primitiveTokens.motion.easing.spring}`,
    `background-color ${primitiveTokens.motion.duration.standard}ms ${primitiveTokens.motion.easing.standard}`,
    `box-shadow ${primitiveTokens.motion.duration.standard}ms ${primitiveTokens.motion.easing.standard}`,
  ].join(", "),
  "@media (prefers-reduced-motion: reduce)": { transition: "none" },
  
  "&:hover": {
    background: semanticTokens.app.accentHover,
    transform: "translateX(-50%) translateY(-2px)",
    boxShadow: `0 6px 0 ${primitiveTokens.color.wood}`,
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
