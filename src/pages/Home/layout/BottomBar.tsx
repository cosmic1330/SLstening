
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import BuildIcon from "@mui/icons-material/Build";
import CategoryIcon from '@mui/icons-material/Category';
import HomeIcon from "@mui/icons-material/Home";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { Box, IconButton,  styled, Tooltip } from "@mui/material"; // Import Tooltip
import { useLocation, useNavigate } from "react-router";
import useAddWebviewWindow from "../../../hooks/useAddWebviewWindow";

const GlassDock = styled(Box)(() => ({
  position: "fixed",
  bottom: 20,
  left: "50%",
  transform: "translateX(-50%)",
  width: "90%",
  maxWidth: "500px",
  height: 70,
  background: "rgba(20, 20, 30, 0.6)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: "24px",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.3)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "0 20px",
  zIndex: 1000,
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  
  "&:hover": {
     boxShadow: "0 12px 40px 0 rgba(0, 0, 0, 0.4)",
     border: "1px solid rgba(255, 255, 255, 0.15)",
  }
}));

const NavButton = styled(IconButton, {
  shouldForwardProp: (prop) => prop !== "active",
})<{ active?: boolean }>(({ active }) => ({
  color: active ? "#60a5fa" : "rgba(255, 255, 255, 0.5)",
  transition: "all 0.2s ease",
  padding: "10px",
  
  "&:hover": {
    background: "rgba(255, 255, 255, 0.05)",
    transform: "translateY(-2px)",
    color: active ? "#60a5fa" : "rgba(255, 255, 255, 0.8)",
  },
  
  "& .MuiSvgIcon-root": {
    fontSize: "1.6rem", // Slightly larger icons
    filter: active ? "drop-shadow(0 0 4px rgba(96, 165, 250, 0.6))" : "none",
  }
}));

const CenterFab = styled(IconButton)(() => ({
  position: "absolute",
  top: -25,
  left: "50%",
  transform: "translateX(-50%)",
  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  color: "#fff",
  padding: 0, 
  width: 56,
  height: 56,
  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
  border: "4px solid #1a1a24", // Match background to create "cutout" effect illusion
  transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)", // Bouncy effect
  
  "&:hover": {
    background: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)",
    transform: "translateX(-50%) translateY(-4px) scale(1.05)",
    boxShadow: "0 8px 20px rgba(37, 99, 235, 0.6)",
  },

  "& .MuiSvgIcon-root": {
      fontSize: "3rem",
  }
}));

export default function BottomBar() {
  const { openAddWindow } = useAddWebviewWindow();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/dashboard" && location.pathname === "/dashboard") return true;
    if (path !== "/dashboard" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <GlassDock>
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
    </GlassDock>
  );
}
