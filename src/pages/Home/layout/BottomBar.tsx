import HubIcon from "@mui/icons-material/Hub";
import InsightsIcon from "@mui/icons-material/Insights";
import SettingsIcon from "@mui/icons-material/Settings";
import VisibilityIcon from "@mui/icons-material/Visibility";
import type { SvgIconComponent } from "@mui/icons-material";
import { Box, ButtonBase, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import useMcpGatewayPolling from "../../../hooks/useMcpGatewayPolling";
import useMcpGatewayStore from "../../../store/mcp.store";
import useUIStore from "../../../store/UI.store";
import { primitiveTokens, semanticTokens } from "../../../theme";
import { BOTTOM_BAR_BOTTOM, BOTTOM_BAR_HEIGHT } from "./constants";

const destinations: Array<{
  path: string;
  label: string;
  icon: SvgIconComponent;
  mcp?: boolean;
}> = [
  { path: "/dashboard", label: "navigation.tracking", icon: VisibilityIcon },
  { path: "/dashboard/market", label: "navigation.market", icon: InsightsIcon },
  { path: "/dashboard/mcp", label: "navigation.mcp", icon: HubIcon, mcp: true },
  { path: "/dashboard/setting", label: "navigation.settings", icon: SettingsIcon },
];

const MCP_STATUS_COLORS = {
  unavailable: primitiveTokens.color.disabledBorder,
  ready: semanticTokens.market.warning,
  active: semanticTokens.market.loss,
} as const;

export default function BottomBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const visible = useUIStore((state) => state.isBottomBarVisible);
  const mcpStatus = useMcpGatewayStore((state) => state.status);
  useMcpGatewayPolling();

  return (
    <Box
      role="navigation"
      aria-label={t("navigation.label")}
      aria-hidden={!visible}
      sx={{
        position: "fixed",
        left: "50%",
        bottom: BOTTOM_BAR_BOTTOM,
        transform: visible ? "translateX(-50%)" : "translateX(-50%) translateY(120px)",
        width: "92%",
        maxWidth: 460,
        height: BOTTOM_BAR_HEIGHT,
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        bgcolor: semanticTokens.app.primary,
        borderRadius: primitiveTokens.radius.lg,
        boxShadow: primitiveTokens.shadow.dock,
        zIndex: primitiveTokens.layer.navigation,
        opacity: visible ? 1 : 0,
        visibility: visible ? "visible" : "hidden",
        pointerEvents: visible ? "auto" : "none",
        transition: "transform 200ms ease, opacity 200ms ease",
        "@media (prefers-reduced-motion: reduce)": { transition: "none" },
      }}
    >
      {destinations.map(({ path, label, icon: Icon, mcp }) => {
        const clean = location.pathname.replace(/\/$/, "");
        const active = path === "/dashboard" ? clean === "/dashboard" : clean.startsWith(path);
        const statusLabel = mcp ? t(`mcp.status.${mcpStatus}`) : null;
        const accessibleLabel = mcp
          ? t("navigation.mcpWithStatus", { status: statusLabel })
          : t(label);
        return (
          <ButtonBase
            key={path}
            tabIndex={visible ? 0 : -1}
            onClick={() => navigate(path)}
            aria-current={active ? "page" : undefined}
            aria-label={accessibleLabel}
            title={mcp ? accessibleLabel : undefined}
            sx={{
              minHeight: 44,
              color: active ? semanticTokens.app.onPrimary : semanticTokens.app.onPrimaryMuted,
              display: "flex",
              flexDirection: "column",
              gap: 0.15,
              borderRadius: "8px",
              "&:focus-visible": {
                outline: `2px solid ${semanticTokens.app.onPrimary}`,
                outlineOffset: -2,
              },
            }}
          >
            {mcp ? (
              <Box component="span" sx={{ position: "relative", display: "inline-flex", lineHeight: 1 }}>
                <Icon fontSize="small" aria-hidden="true" />
                <Box
                  component="span"
                  aria-hidden="true"
                  sx={{
                    position: "absolute",
                    right: -4,
                    top: -2,
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: MCP_STATUS_COLORS[mcpStatus],
                    border: `1px solid ${semanticTokens.app.primary}`,
                  }}
                />
              </Box>
            ) : <Icon fontSize="small" aria-hidden="true" />}
            <Typography variant="caption" fontWeight={active ? 800 : 600}>{t(label)}</Typography>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
