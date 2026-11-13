import ArrowBackIcon from "@mui/icons-material/ArrowBackIosNew";
import ChartIcon from "@mui/icons-material/BarChart";
import BugReportIcon from "@mui/icons-material/BugReport";
import DownloadIcon from "@mui/icons-material/CloudDownload";
import BackupIcon from "@mui/icons-material/CloudUpload";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TopIcon from "@mui/icons-material/Layers";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/PersonOutline";
import SettingsIcon from "@mui/icons-material/Settings";
import TuneIcon from "@mui/icons-material/Tune";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  styled,
  Switch,
  Typography,
} from "@mui/material";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useUser } from "../../../context/UserContext";
import useDownloadStocks from "../../../hooks/useDownloadStocks";
import useDebugStore from "../../../store/debug.store";
import useUIStore from "../../../store/UI.store";
import useStocksStore from "../../../store/Stock.store";
import { CLOUD_BACKUP_MAX_BYTES, cloudBackupPayloadBytes } from "../../../account/cloudBackup";
import { getAutoUpdateEnabled, openNativeLogDirectory, setAutoUpdateEnabled } from "../../../account/native";
import IndicatorSettingsSection from "./IndicatorSettingsSection";
// Important: Make sure this path is correct or hardcode the version
import pkg from "../../../../package.json";

const VERSION = pkg.version || "0.1.0";

const settingsPalette = {
  canvas: "#F4F7FA",
  paper: "#FFFFFF",
  ink: "#172033",
  muted: "#667085",
  outline: "#D8E0EA",
  blue: "#DCEEFF",
  blueDark: "#1769AA",
  pink: "#FDE7F0",
  yellow: "#FFF1C2",
  green: "#DFF3E8",
  lavender: "#EBE5FF",
  white: "#FFFFFF",
} as const;

type MarketVisibilityKey =
  | "cnn"
  | "mm"
  | "nasdaq"
  | "sox"
  | "twse"
  | "otc"
  | "wtx"
  | "margin";

type MarketVisibility = Record<MarketVisibilityKey, boolean>;

const MARKET_VISIBILITY_KEYS: readonly MarketVisibilityKey[] = [
  "cnn",
  "mm",
  "nasdaq",
  "sox",
  "twse",
  "otc",
  "wtx",
  "margin",
];

const DEFAULT_MARKET_VISIBILITY: MarketVisibility = {
  cnn: true,
  mm: true,
  nasdaq: true,
  sox: true,
  twse: true,
  otc: true,
  wtx: true,
  margin: true,
};

const readMarketVisibility = (): MarketVisibility => {
  const saved = localStorage.getItem("slitenting-market-info-visibility");
  if (!saved) return { ...DEFAULT_MARKET_VISIBILITY };

  try {
    const parsed: unknown = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ...DEFAULT_MARKET_VISIBILITY };
    }

    const record = parsed as Record<string, unknown>;
    return MARKET_VISIBILITY_KEYS.reduce<MarketVisibility>((next, key) => {
      next[key] = typeof record[key] === "boolean" ? record[key] : true;
      return next;
    }, { ...DEFAULT_MARKET_VISIBILITY });
  } catch {
    return { ...DEFAULT_MARKET_VISIBILITY };
  }
};

const PageContainer = styled(Box)({
  position: "relative",
  width: "100%",
  height: "100%",
  overflowX: "hidden",
  overflowY: "auto",
  backgroundColor: settingsPalette.canvas,
  color: settingsPalette.ink,
  paddingBottom: "calc(108px + env(safe-area-inset-bottom, 0px))",
  "@media (prefers-reduced-motion: reduce)": {
    scrollBehavior: "auto",
  },
});

const MainCard = styled(Paper)({
  backgroundColor: "transparent",
  boxShadow: "none",
});

const SectionCard = styled("section")({
  backgroundColor: settingsPalette.paper,
  border: `1px solid ${settingsPalette.outline}`,
  borderRadius: 16,
  boxShadow: "0 1px 3px rgba(23, 32, 51, 0.06)",
  overflow: "hidden",
});

const SettingRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 0,
  minHeight: 64,
  padding: "10px 12px",
  border: `1px solid ${settingsPalette.outline}`,
  borderRadius: 12,
  backgroundColor: "#F8FAFC",
  transition: "background-color 150ms ease",
  "&:hover": {
    backgroundColor: "#F1F5F9",
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
  },
});

const FocusableButton = styled(Button)({
  minHeight: 44,
  borderRadius: 10,
  border: `1px solid ${settingsPalette.outline}`,
  boxShadow: "none",
  color: settingsPalette.ink,
  fontWeight: 900,
  lineHeight: 1.15,
  textTransform: "none",
  transition: "background-color 150ms ease",
  "&:hover": {
    boxShadow: "none",
  },
  "&:focus-visible": {
    outline: `3px solid ${settingsPalette.blueDark}`,
    outlineOffset: 3,
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
  },
});

const DisclosureSummary = styled(Button)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  minHeight: 68,
  padding: "11px 14px",
  borderRadius: 0,
  color: settingsPalette.ink,
  textAlign: "left",
  textTransform: "none",
  "&:focus-visible": {
    outline: `3px solid ${settingsPalette.blueDark}`,
    outlineOffset: -4,
  },
});

const SectionIcon = styled(Box)({
  display: "grid",
  placeItems: "center",
  flex: "0 0 auto",
  width: 42,
  height: 42,
  borderRadius: 12,
  color: settingsPalette.ink,
});

const SwitchStyles = {
  flexShrink: 0,
  "& .MuiSwitch-switchBase.Mui-checked": {
    color: settingsPalette.blueDark,
  },
  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
    backgroundColor: settingsPalette.blue,
    opacity: 1,
  },
  "& .MuiSwitch-track": {
    backgroundColor: "rgba(25, 25, 25, 0.25)",
    opacity: 1,
  },
  "& .MuiSwitch-switchBase.Mui-focusVisible": {
    outline: `3px solid ${settingsPalette.blueDark}`,
    outlineOffset: 2,
  },
};

const marketVisibilityGroups: Array<{
  labelKey: "indices" | "signals";
  items: Array<{ key: MarketVisibilityKey; labelKey: string }>;
}> = [{
  labelKey: "indices",
  items: [
    { key: "twse", labelKey: "twse" },
    { key: "otc", labelKey: "otc" },
    { key: "wtx", labelKey: "wtx" },
    { key: "nasdaq", labelKey: "nasdaq" },
    { key: "sox", labelKey: "sox" },
  ],
}, {
  labelKey: "signals",
  items: [
    { key: "cnn", labelKey: "cnn" },
    { key: "mm", labelKey: "mm" },
    { key: "margin", labelKey: "margin" },
  ],
}];

function SettingRowText({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Typography
        component="p"
        sx={{
          color: settingsPalette.ink,
          fontSize: "0.96rem",
          fontWeight: 900,
          lineHeight: 1.2,
          overflowWrap: "anywhere",
        }}
      >
        {title}
      </Typography>
      {hint ? (
        <Typography
          component="p"
          sx={{
            mt: 0.45,
            color: settingsPalette.muted,
            fontSize: "0.75rem",
            fontWeight: 600,
            lineHeight: 1.35,
            overflowWrap: "anywhere",
          }}
        >
          {hint}
        </Typography>
      ) : null}
    </Box>
  );
}

function SectionHeading({
  icon,
  title,
  hint,
  accent,
  headingId,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  accent: string;
  headingId: string;
}) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center" sx={{ px: 1, pt: 1, pb: 1.5 }}>
      <SectionIcon sx={{ backgroundColor: accent }} aria-hidden="true">
        {icon}
      </SectionIcon>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          id={headingId}
          component="h2"
          sx={{ fontSize: { xs: "1.05rem", sm: "1.12rem" }, fontWeight: 950, lineHeight: 1.15 }}
        >
          {title}
        </Typography>
        {hint ? (
          <Typography component="p" sx={{ mt: 0.35, color: settingsPalette.muted, fontSize: "0.76rem", fontWeight: 650, lineHeight: 1.35 }}>
            {hint}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
}

function DisclosureCard({
  id,
  title,
  hint,
  icon,
  accent,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  hint: string;
  icon: React.ReactNode;
  accent: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const summaryId = `${id}-summary`;
  const contentId = `${id}-content`;

  return (
    <SectionCard aria-labelledby={summaryId}>
      <DisclosureSummary
        id={summaryId}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={open ? contentId : undefined}
        aria-label={title}
      >
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
          <SectionIcon sx={{ width: 38, height: 38, borderRadius: 12, backgroundColor: accent }} aria-hidden="true">
            {icon}
          </SectionIcon>
          <Box sx={{ minWidth: 0 }}>
            <Typography component="span" sx={{ display: "block", fontWeight: 950, lineHeight: 1.15, overflowWrap: "anywhere" }}>
              {title}
            </Typography>
            <Typography component="span" sx={{ display: "block", mt: 0.35, color: settingsPalette.muted, fontSize: "0.74rem", fontWeight: 600, lineHeight: 1.35 }}>
              {hint}
            </Typography>
          </Box>
        </Stack>
        <ExpandMoreIcon
          aria-hidden="true"
          sx={{
            flexShrink: 0,
            ml: 1,
            fontSize: 28,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms ease",
            "@media (prefers-reduced-motion: reduce)": { transition: "none" },
          }}
        />
      </DisclosureSummary>
      {open ? (
        <Box
          id={contentId}
          role="region"
          aria-labelledby={summaryId}
          sx={{ px: { xs: 1.25, sm: 1.75 }, pb: 1.75 }}
        >
          {children}
        </Box>
      ) : null}
    </SectionCard>
  );
}

function Setting() {
  const { t, i18n } = useTranslation();
  const { session, signOut, isSigningOut, signOutError } = useUser();
  const { handleDownloadMenu, disable } = useDownloadStocks();
  const navigate = useNavigate();
  const stockBoxChartType = useUIStore((state) => state.stockBoxChartType);
  const setStockBoxChartType = useUIStore((state) => state.setStockBoxChartType);
  const cloudBackupEnabled = useStocksStore((state) => state.cloudBackupEnabled);
  const cloudBackupLastSuccessAt = useStocksStore((state) => state.cloudBackupLastSuccessAt);
  const stocks = useStocksStore((state) => state.stocks);
  const categories = useStocksStore((state) => state.categories);
  const accountHydrated = useStocksStore((state) => state.hydrated);
  const setCloudBackupEnabled = useStocksStore((state) => state.setCloudBackupEnabled);
  const restoreCloudBackup = useStocksStore((state) => state.restoreCloudBackup);

  const [alwaysOnTop, setAlwaysOnTop] = useState(
    localStorage.getItem("slitenting-alwaysOnTop") === "true",
  );
  const [autoUpdateEnabled, setAutoUpdateEnabledState] = useState(true);
  const [autoUpdateLoaded, setAutoUpdateLoaded] = useState(false);
  // Keep debug subscriptions narrow; the fallback keeps lightweight test doubles
  // that return the store object compatible with this page.
  const debugModeValue = useDebugStore((state) => state.isVisible) as unknown;
  const toggleVisibilityValue = useDebugStore((state) => state.toggleVisibility) as unknown;
  const debugMode = typeof debugModeValue === "boolean"
    ? debugModeValue
    : Boolean((debugModeValue as { isVisible?: unknown } | null)?.isVisible);
  const toggleVisibility = useCallback(() => {
    if (typeof toggleVisibilityValue === "function") {
      (toggleVisibilityValue as () => void)();
      return;
    }
    (debugModeValue as { toggleVisibility?: () => void } | null)?.toggleVisibility?.();
  }, [debugModeValue, toggleVisibilityValue]);
  const [marketVisibility, setMarketVisibility] = useState<MarketVisibility>(readMarketVisibility);
  const [dataOpen, setDataOpen] = useState(false);
  const [logOpenError, setLogOpenError] = useState(false);
  const [indicatorOpen, setIndicatorOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<"idle" | "loading" | "restored" | "not_found" | "error">("idle");
  const restoreRequestInFlight = useRef(false);
  const restoreRequestGeneration = useRef(0);
  const accountEmail = session?.user?.email?.trim() || t("settings.accountUnknown");
  const accountUserId = session?.user?.id?.trim() || t("settings.accountUnknown");

  const handleSignOut = useCallback(() => {
    void signOut().catch(() => undefined);
  }, [signOut]);

  const handleAlwaysOnTopChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const checked = event.target.checked;
      setAlwaysOnTop(checked);
      localStorage.setItem("slitenting-alwaysOnTop", checked.toString());
      void getCurrentWindow().setAlwaysOnTop(checked);
    },
    [],
  );

  useEffect(() => {
    let active = true;
    void getAutoUpdateEnabled().then((enabled) => {
      if (!active) return;
      setAutoUpdateEnabledState(enabled);
      setAutoUpdateLoaded(true);
    }).catch(() => {
      if (active) setAutoUpdateLoaded(true);
    });
    return () => { active = false; };
  }, []);

  const handleAutoUpdateChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    setAutoUpdateEnabledState(enabled);
    void setAutoUpdateEnabled(enabled).catch(() => setAutoUpdateEnabledState(!enabled));
  }, []);

  const handleMarketVisibilityChange = useCallback(
    (key: MarketVisibilityKey, checked: boolean) => {
      setMarketVisibility((previous) => {
        const next: MarketVisibility = { ...previous, [key]: checked };
        localStorage.setItem("slitenting-market-info-visibility", JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const handleAllMarketVisibility = useCallback((visible: boolean) => {
    const next = MARKET_VISIBILITY_KEYS.reduce<MarketVisibility>((settings, key) => {
      settings[key] = visible;
      return settings;
    }, { ...DEFAULT_MARKET_VISIBILITY });
    localStorage.setItem("slitenting-market-info-visibility", JSON.stringify(next));
    setMarketVisibility(next);
  }, []);

  const handleCloudBackupChange = useCallback((checked: boolean) => {
    void setCloudBackupEnabled(checked).catch(() => undefined);
  }, [setCloudBackupEnabled]);

  const handleRestoreDialogOpen = useCallback(() => {
    setRestoreStatus("idle");
    setRestoreDialogOpen(true);
  }, []);

  const handleRestoreDialogClose = useCallback(() => {
    if (restoreStatus !== "loading") setRestoreDialogOpen(false);
  }, [restoreStatus]);

  const handleRestoreConfirm = useCallback(() => {
    if (restoreStatus === "loading" || restoreRequestInFlight.current) return;
    restoreRequestInFlight.current = true;
    const requestGeneration = restoreRequestGeneration.current + 1;
    restoreRequestGeneration.current = requestGeneration;
    setRestoreStatus("loading");
    void restoreCloudBackup()
      .then((result) => {
        if (restoreRequestGeneration.current === requestGeneration) setRestoreStatus(result);
      })
      .catch(() => {
        if (restoreRequestGeneration.current === requestGeneration) setRestoreStatus("error");
      })
      .finally(() => {
        if (restoreRequestGeneration.current !== requestGeneration) return;
        restoreRequestInFlight.current = false;
        setRestoreDialogOpen(false);
      });
  }, [restoreCloudBackup, restoreStatus]);

  const backupBytes = useMemo(
    () => cloudBackupPayloadBytes({ stocks, categories }),
    [stocks, categories],
  );
  const backupOverLimit = backupBytes > CLOUD_BACKUP_MAX_BYTES;

  const lastBackupLabel = cloudBackupLastSuccessAt
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage?.startsWith("zh") ? "zh-TW" : "en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(cloudBackupLastSuccessAt))
    : t("settings.cloudBackupNever");

  const activeLanguage = i18n.resolvedLanguage?.toLowerCase().startsWith("zh") ? "zh-TW" : "en";
  const visibleMarketCount = Object.values(marketVisibility).filter(Boolean).length;

  return (
    <PageContainer>
      <Container
        component="main"
        maxWidth="md"
        sx={{
          position: "relative",
          width: "100%",
          px: { xs: 1.25, sm: 3, md: 4 },
          pt: { xs: 1.5, sm: 2.5 },
          pb: 3,
        }}
      >
        <Stack component="header" spacing={1.4} sx={{ mb: { xs: 2.25, sm: 3 } }}>
          <Stack direction="row" alignItems="flex-start" spacing={1.25}>
            <IconButton
              onClick={() => navigate("/dashboard")}
              aria-label={t("a11y.back")}
              sx={{
                flexShrink: 0,
                width: 44,
                height: 44,
                mt: 0.35,
                color: settingsPalette.ink,
                backgroundColor: settingsPalette.paper,
                border: `1px solid ${settingsPalette.outline}`,
                borderRadius: 12,
                boxShadow: "0 1px 2px rgba(23, 32, 51, 0.08)",
                "&:hover": { backgroundColor: "#F8FAFC" },
                "&:focus-visible": { outline: `3px solid ${settingsPalette.blueDark}`, outlineOffset: 3 },
                "@media (prefers-reduced-motion: reduce)": { transition: "none" },
              }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography component="p" sx={{ color: settingsPalette.blueDark, fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {t("settings.eyebrow")}
              </Typography>
              <Typography component="h1" sx={{ mt: 0.25, color: settingsPalette.ink, fontSize: { xs: "1.65rem", sm: "2rem" }, fontWeight: 850, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                {t("settings.title")}
              </Typography>
              <Typography component="p" sx={{ mt: 0.75, color: settingsPalette.muted, fontSize: { xs: "0.8rem", sm: "0.88rem" }, fontWeight: 650, lineHeight: 1.45, maxWidth: 560 }}>
                {t("settings.subtitle")}
              </Typography>
            </Box>
          </Stack>

          <Box component="section" aria-labelledby="settings-language-heading" sx={{ pl: { xs: 0, sm: 6.5 } }}>
            <Typography id="settings-language-heading" component="h2" sx={{ mb: 0.75, color: settingsPalette.ink, fontSize: "0.82rem", fontWeight: 950 }}>
              {t("settings.languageLabel")}
            </Typography>
            <Stack direction="row" spacing={1} role="group" aria-label={t("settings.languageLabel")}>
              {(["en", "zh-TW"] as const).map((language) => {
                const selected = activeLanguage === language;
                return (
                  <FocusableButton
                    key={language}
                    type="button"
                    onClick={() => void i18n.changeLanguage(language)}
                    aria-pressed={selected}
                    sx={{
                      flex: 1,
                      maxWidth: 190,
                      backgroundColor: selected ? settingsPalette.blue : settingsPalette.white,
                      "&:hover": { backgroundColor: selected ? settingsPalette.blue : "#F1F5F9" },
                    }}
                  >
                    {t(`language.${language}`)}
                  </FocusableButton>
                );
              })}
            </Stack>
          </Box>
        </Stack>

        <MainCard elevation={0}>
          <SectionCard aria-labelledby="settings-market-heading" sx={{ mb: 1.5 }}>
            <SectionHeading
              headingId="settings-market-heading"
              icon={<SettingsIcon fontSize="small" />}
              title={t("settings.marketInfo")}
              hint={t("settings.marketInfoSectionHint")}
              accent={settingsPalette.blue}
            />
            <Stack spacing={1.5} sx={{ px: { xs: 1, sm: 1.5 }, pb: 1.5 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Typography sx={{ color: settingsPalette.muted, fontSize: "0.76rem", fontWeight: 750 }}>
                  {t("settings.marketVisibleCount", { visible: visibleMarketCount, total: MARKET_VISIBILITY_KEYS.length })}
                </Typography>
                <Stack direction="row" spacing={0.75}>
                  <FocusableButton
                    type="button"
                    onClick={() => handleAllMarketVisibility(true)}
                    disabled={visibleMarketCount === MARKET_VISIBILITY_KEYS.length}
                    sx={{ minHeight: 32, px: 1.1, py: 0.25, fontSize: "0.72rem", backgroundColor: settingsPalette.white }}
                  >
                    {t("settings.showAllMarkets")}
                  </FocusableButton>
                  <FocusableButton
                    type="button"
                    onClick={() => handleAllMarketVisibility(false)}
                    disabled={visibleMarketCount === 0}
                    sx={{ minHeight: 32, px: 1.1, py: 0.25, fontSize: "0.72rem", backgroundColor: settingsPalette.white }}
                  >
                    {t("settings.hideAllMarkets")}
                  </FocusableButton>
                </Stack>
              </Stack>

              {marketVisibilityGroups.map((group) => (
                <Box key={group.labelKey}>
                  <Typography component="h3" sx={{ mb: 0.65, color: settingsPalette.ink, fontSize: "0.78rem", fontWeight: 850 }}>
                    {t(`settings.marketGroups.${group.labelKey}`)}
                  </Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))" }, gap: 0.75 }}>
                    {group.items.map(({ key, labelKey }) => {
                      const label = t(`settings.marketLabels.${labelKey}`);
                      const checked = marketVisibility[key];
                      return (
                        <Box
                          component="label"
                          key={key}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 0.5,
                            minWidth: 0,
                            minHeight: 48,
                            px: 1,
                            py: 0.4,
                            border: "1px solid",
                            borderColor: checked ? "#90CAF9" : settingsPalette.outline,
                            borderRadius: 2.5,
                            backgroundColor: checked ? "#F0F7FF" : "#F8FAFC",
                            cursor: "pointer",
                          }}
                        >
                          <Typography component="span" sx={{ minWidth: 0, color: settingsPalette.ink, fontSize: "0.75rem", fontWeight: 750, lineHeight: 1.25, overflowWrap: "anywhere" }}>
                            {label}
                          </Typography>
                          <Switch
                            size="small"
                            checked={checked}
                            onChange={(event) => handleMarketVisibilityChange(key, event.target.checked)}
                            slotProps={{ input: { "aria-label": label } }}
                            sx={SwitchStyles}
                          />
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              ))}
            </Stack>
          </SectionCard>

          <SectionCard aria-labelledby="settings-application-heading" sx={{ mb: 1.5 }}>
            <SectionHeading
              headingId="settings-application-heading"
              icon={<TopIcon fontSize="small" />}
              title={t("settings.application")}
              hint={t("settings.applicationHint")}
              accent={settingsPalette.yellow}
            />
            <Stack spacing={1} sx={{ px: { xs: 1, sm: 1.5 }, pb: 1.5 }}>
              <SettingRow>
                <SectionIcon sx={{ width: 38, height: 38, borderRadius: 12, backgroundColor: settingsPalette.green }} aria-hidden="true">
                  <TopIcon fontSize="small" />
                </SectionIcon>
                <SettingRowText title={t("settings.alwaysOnTop")} hint={t("settings.alwaysOnTopHint")} />
                <Switch
                  checked={alwaysOnTop}
                  onChange={handleAlwaysOnTopChange}
                  slotProps={{ input: { "aria-label": t("settings.alwaysOnTop") } }}
                  sx={SwitchStyles}
                />
              </SettingRow>

              <SettingRow>
                <SectionIcon sx={{ width: 38, height: 38, borderRadius: 12, backgroundColor: settingsPalette.lavender }} aria-hidden="true">
                  <DownloadIcon fontSize="small" />
                </SectionIcon>
                <SettingRowText title={t("settings.autoUpdate")} hint={t("settings.autoUpdateHint")} />
                <Switch
                  checked={autoUpdateEnabled}
                  disabled={!autoUpdateLoaded}
                  onChange={handleAutoUpdateChange}
                  slotProps={{ input: { "aria-label": t("settings.autoUpdate") } }}
                  sx={SwitchStyles}
                />
              </SettingRow>

              <SettingRow sx={{ alignItems: { xs: "stretch", sm: "center" }, flexDirection: { xs: "column", sm: "row" } }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                  <SectionIcon sx={{ width: 38, height: 38, borderRadius: 12, backgroundColor: settingsPalette.blue }} aria-hidden="true">
                    <ChartIcon fontSize="small" />
                  </SectionIcon>
                  <SettingRowText title={t("settings.cardChart")} hint={t("settings.cardChartHint")} />
                </Stack>
                <Stack direction="row" spacing={0.75} role="group" aria-label={t("settings.cardChart")} sx={{ width: { xs: "100%", sm: "auto" }, pl: { xs: 6.25, sm: 0 } }}>
                  <FocusableButton
                    type="button"
                    onClick={() => setStockBoxChartType("tick")}
                    aria-pressed={stockBoxChartType === "tick"}
                    sx={{ flex: 1, minWidth: { xs: 0, sm: 80 }, backgroundColor: stockBoxChartType === "tick" ? settingsPalette.blue : settingsPalette.white, "&:hover": { backgroundColor: stockBoxChartType === "tick" ? settingsPalette.blue : "#F1F5F9" } }}
                  >
                    {t("settings.live")}
                  </FocusableButton>
                  <FocusableButton
                    type="button"
                    onClick={() => setStockBoxChartType("mak")}
                    aria-pressed={stockBoxChartType === "mak"}
                    sx={{ flex: 1, minWidth: { xs: 0, sm: 104 }, backgroundColor: stockBoxChartType === "mak" ? settingsPalette.blue : settingsPalette.white, "&:hover": { backgroundColor: stockBoxChartType === "mak" ? settingsPalette.blue : "#F1F5F9" } }}
                  >
                    {t("settings.candle")}
                  </FocusableButton>
                </Stack>
              </SettingRow>
            </Stack>
          </SectionCard>

          <Stack spacing={1.5}>
            <DisclosureCard
              id="data-diagnostics"
              title={t("settings.dataDiagnostics")}
              hint={t("settings.dataSectionHint")}
              icon={<DownloadIcon fontSize="small" />}
              accent={settingsPalette.green}
              open={dataOpen}
              onToggle={() => setDataOpen((current) => !current)}
            >
              <Stack spacing={1}>
                <SettingRow sx={{ alignItems: { xs: "flex-start", sm: "center" }, flexDirection: { xs: "column", sm: "row" } }}>
                  <SectionIcon sx={{ width: 38, height: 38, borderRadius: 12, backgroundColor: settingsPalette.green }} aria-hidden="true">
                    <DownloadIcon fontSize="small" />
                  </SectionIcon>
                  <SettingRowText title={t("settings.updateStocks")} hint={t("settings.updateStocksHint")} />
                  <FocusableButton
                    type="button"
                    onClick={() => void handleDownloadMenu()}
                    disabled={disable}
                    aria-busy={disable}
                    startIcon={disable ? <CircularProgress size={16} color="inherit" aria-hidden="true" /> : <DownloadIcon fontSize="small" aria-hidden="true" />}
                    sx={{ width: { xs: "100%", sm: "auto" }, backgroundColor: settingsPalette.yellow, "&:hover": { backgroundColor: "#EBC85A" }, "&.Mui-disabled": { color: "rgba(25, 25, 25, 0.72)", backgroundColor: "#EEE0AE", borderColor: "rgba(25, 25, 25, 0.45)" } }}
                  >
                    {disable ? t("settings.updating") : t("settings.update")}
                  </FocusableButton>
                </SettingRow>
                <SettingRow>
                  <SectionIcon sx={{ width: 38, height: 38, borderRadius: 12, backgroundColor: settingsPalette.lavender }} aria-hidden="true">
                    <BugReportIcon fontSize="small" />
                  </SectionIcon>
                  <SettingRowText title={t("settings.developer")} hint={t("settings.developerHint")} />
                  <Switch
                    checked={debugMode}
                    onChange={toggleVisibility}
                    slotProps={{ input: { "aria-label": t("settings.developer") } }}
                    sx={SwitchStyles}
                  />
                </SettingRow>
                <SettingRow sx={{ alignItems: { xs: "flex-start", sm: "center" }, flexDirection: { xs: "column", sm: "row" } }}>
                  <SectionIcon sx={{ width: 38, height: 38, borderRadius: 12, backgroundColor: settingsPalette.blue }} aria-hidden="true"><BugReportIcon fontSize="small" /></SectionIcon>
                  <SettingRowText title={t("settings.openLogFolder")} hint={t("settings.openLogFolderHint")} />
                  <FocusableButton type="button" onClick={() => void openNativeLogDirectory().then(() => setLogOpenError(false)).catch(() => setLogOpenError(true))} sx={{ width: { xs: "100%", sm: "auto" } }}>{t("settings.openLogFolder")}</FocusableButton>
                </SettingRow>
                {logOpenError ? <Alert severity="error">{t("settings.openLogFolderFailed")}</Alert> : null}
                <Stack spacing={1}>
                  <SettingRow>
                    <SectionIcon sx={{ width: 38, height: 38, borderRadius: 12, backgroundColor: settingsPalette.blue }} aria-hidden="true">
                      <BackupIcon fontSize="small" />
                    </SectionIcon>
                    <SettingRowText
                      title={t("settings.automaticCloudUpload")}
                      hint={t(cloudBackupEnabled ? "settings.cloudBackupEnabledHint" : "settings.cloudBackupDisabledHint", { lastBackup: lastBackupLabel })}
                    />
                    <Switch
                      checked={cloudBackupEnabled}
                      disabled={!accountHydrated || (backupOverLimit && !cloudBackupEnabled)}
                      onChange={(event) => handleCloudBackupChange(event.target.checked)}
                      slotProps={{ input: { "aria-label": t("settings.automaticCloudUpload") } }}
                      sx={SwitchStyles}
                    />
                  </SettingRow>
                  <SettingRow sx={{ alignItems: { xs: "flex-start", sm: "center" }, flexDirection: { xs: "column", sm: "row" } }}>
                    <SectionIcon sx={{ width: 38, height: 38, borderRadius: 12, backgroundColor: settingsPalette.lavender }} aria-hidden="true">
                      <DownloadIcon fontSize="small" />
                    </SectionIcon>
                    <SettingRowText title={t("settings.restoreCloudBackup")} hint={t("settings.restoreCloudBackupHint")} />
                    <FocusableButton
                      type="button"
                      onClick={handleRestoreDialogOpen}
                      disabled={!accountHydrated || restoreStatus === "loading"}
                      aria-busy={restoreStatus === "loading"}
                      aria-label={t(restoreStatus === "loading" ? "settings.restoringCloudBackup" : "settings.restoreCloudBackup")}
                      startIcon={restoreStatus === "loading" ? <CircularProgress size={16} color="inherit" aria-hidden="true" /> : <DownloadIcon fontSize="small" aria-hidden="true" />}
                      sx={{ width: { xs: "100%", sm: "auto" }, backgroundColor: settingsPalette.lavender, "&:hover": { backgroundColor: "#BDB0EA" }, "&.Mui-disabled": { color: "rgba(25, 25, 25, 0.72)", backgroundColor: "#E2DCF5", borderColor: "rgba(25, 25, 25, 0.45)" } }}
                    >
                      {restoreStatus === "loading" ? t("settings.restoringCloudBackup") : t("settings.restoreCloudBackup")}
                    </FocusableButton>
                  </SettingRow>
                  {restoreStatus === "restored" ? <Alert severity="success" role="status">{t("settings.restoreCloudBackupSuccess")}</Alert> : null}
                  {restoreStatus === "not_found" ? <Alert severity="info" role="status">{t("settings.restoreCloudBackupNotFound")}</Alert> : null}
                  {restoreStatus === "error" ? <Alert severity="error" role="alert">{t("settings.restoreCloudBackupFailed")}</Alert> : null}
                  {backupOverLimit ? (
                    <Alert severity="warning" role="alert">
                      {t("settings.cloudBackupSizeLimit", { bytes: backupBytes, limit: CLOUD_BACKUP_MAX_BYTES })}
                    </Alert>
                  ) : null}
                </Stack>
              </Stack>
            </DisclosureCard>

            <Dialog
              open={restoreDialogOpen}
              onClose={handleRestoreDialogClose}
              fullWidth
              maxWidth="xs"
              aria-labelledby="restore-cloud-backup-title"
              aria-describedby="restore-cloud-backup-description"
            >
              <DialogTitle id="restore-cloud-backup-title">{t("settings.restoreCloudBackupConfirmTitle")}</DialogTitle>
              <DialogContent dividers>
                <Typography id="restore-cloud-backup-description">{t("settings.restoreCloudBackupConfirmMessage")}</Typography>
              </DialogContent>
              <DialogActions sx={{ p: 2, gap: 1, flexWrap: "wrap" }}>
                <Button onClick={handleRestoreDialogClose} disabled={restoreStatus === "loading"}>{t("settings.cancel")}</Button>
                <Button variant="contained" onClick={handleRestoreConfirm} disabled={restoreStatus === "loading"} aria-busy={restoreStatus === "loading"}>
                  {restoreStatus === "loading" ? t("settings.restoringCloudBackup") : t("settings.confirmRestoreCloudBackup")}
                </Button>
              </DialogActions>
            </Dialog>

            <DisclosureCard
              id="technical-indicators"
              title={t("settings.indicators")}
              hint={t("settings.indicatorSectionHint")}
              icon={<TuneIcon fontSize="small" />}
              accent={settingsPalette.blue}
              open={indicatorOpen}
              onToggle={() => setIndicatorOpen((current) => !current)}
            >
              <IndicatorSettingsSection />
            </DisclosureCard>
          </Stack>

          <SectionCard aria-labelledby="settings-account-heading" sx={{ mt: 2.25 }}>
            <SectionHeading
              headingId="settings-account-heading"
              icon={<PersonIcon fontSize="small" />}
              title={t("settings.account")}
              hint={t("settings.accountHint")}
              accent={settingsPalette.lavender}
            />
            <Stack spacing={1} sx={{ px: { xs: 1, sm: 1.5 }, pb: 1.5 }}>
              <SettingRow sx={{ alignItems: { xs: "stretch", sm: "center" }, flexDirection: { xs: "column", sm: "row" } }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                  <SectionIcon sx={{ width: 38, height: 38, borderRadius: 12, backgroundColor: settingsPalette.lavender }} aria-hidden="true">
                    <PersonIcon fontSize="small" />
                  </SectionIcon>
                  <Stack spacing={0.75} sx={{ minWidth: 0, flex: 1 }}>
                    <SettingRowText title={t("settings.accountEmail")} hint={accountEmail} />
                    <SettingRowText title={t("settings.accountUserId")} hint={accountUserId} />
                  </Stack>
                </Stack>
                <FocusableButton
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  aria-busy={isSigningOut}
                  aria-label={t(isSigningOut ? "settings.signingOut" : "settings.logout")}
                  startIcon={isSigningOut ? <CircularProgress size={16} color="inherit" aria-hidden="true" /> : <LogoutIcon fontSize="small" aria-hidden="true" />}
                  sx={{
                    width: { xs: "100%", sm: "auto" },
                    backgroundColor: "#F2B8B5",
                    "&:hover": { backgroundColor: "#E99C97" },
                    "&.Mui-disabled": { color: "rgba(25, 25, 25, 0.72)", backgroundColor: "#EBCBC8", borderColor: "rgba(25, 25, 25, 0.45)" },
                  }}
                >
                  {isSigningOut ? t("settings.signingOut") : t("settings.logout")}
                </FocusableButton>
              </SettingRow>
              {signOutError ? (
                <Alert severity="error" role="alert" sx={{ border: `2px solid ${settingsPalette.outline}`, borderRadius: 15, color: settingsPalette.ink, fontWeight: 700 }}>
                  {t("settings.signOutError", { error: signOutError })}
                </Alert>
              ) : null}
            </Stack>
          </SectionCard>
        </MainCard>

        <Stack alignItems="center" spacing={0.75} sx={{ mt: 3.5, opacity: 0.72 }}>
          <Typography component="p" sx={{ color: settingsPalette.muted, fontSize: "0.72rem", fontWeight: 950, letterSpacing: "0.12em" }}>
            SLSTEN
          </Typography>
          <Typography component="p" sx={{ color: settingsPalette.muted, fontSize: "0.7rem", fontWeight: 700 }}>
            {t("settings.version", { version: VERSION })}
          </Typography>
        </Stack>
      </Container>
    </PageContainer>
  );
}

export default Setting;
