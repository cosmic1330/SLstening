import ArrowBackIcon from "@mui/icons-material/ArrowBackIosNew";
import ChartIcon from "@mui/icons-material/BarChart";
import BugReportIcon from "@mui/icons-material/BugReport";
import DownloadIcon from "@mui/icons-material/CloudDownload";
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
  IconButton,
  Paper,
  Stack,
  styled,
  Switch,
  Typography,
} from "@mui/material";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useUser } from "../../../context/UserContext";
import useDownloadStocks from "../../../hooks/useDownloadStocks";
import useDebugStore from "../../../store/debug.store";
import useUIStore from "../../../store/UI.store";
import IndicatorSettingsSection from "./IndicatorSettingsSection";
// Important: Make sure this path is correct or hardcode the version
import pkg from "../../../../package.json";

const VERSION = pkg.version || "0.1.0";

const settingsPalette = {
  canvas: "#FFF8F3",
  paper: "#FFFDF8",
  ink: "#171717",
  muted: "#6D625D",
  outline: "#191919",
  blue: "#6BB7E8",
  blueDark: "#246D9B",
  pink: "#F4B5D0",
  yellow: "#F3D36D",
  green: "#A8D8B8",
  lavender: "#C9BDF2",
  white: "#FFFFFF",
} as const;

type MarketVisibilityKey =
  | "cnn"
  | "mm"
  | "nasdaq"
  | "twse"
  | "otc"
  | "wtx"
  | "margin";

type MarketVisibility = Record<MarketVisibilityKey, boolean>;

const MARKET_VISIBILITY_KEYS: readonly MarketVisibilityKey[] = [
  "cnn",
  "mm",
  "nasdaq",
  "twse",
  "otc",
  "wtx",
  "margin",
];

const DEFAULT_MARKET_VISIBILITY: MarketVisibility = {
  cnn: true,
  mm: true,
  nasdaq: true,
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
  backgroundImage: `
    radial-gradient(circle at 7% 9%, rgba(244, 181, 208, 0.42) 0 44px, transparent 45px),
    radial-gradient(circle at 95% 42%, rgba(107, 183, 232, 0.24) 0 64px, transparent 65px),
    linear-gradient(135deg, rgba(243, 211, 109, 0.14), transparent 38%),
    linear-gradient(315deg, rgba(168, 216, 184, 0.16), transparent 44%)`,
  color: settingsPalette.ink,
  paddingBottom: "calc(108px + env(safe-area-inset-bottom, 0px))",
  "@media (prefers-reduced-motion: reduce)": {
    scrollBehavior: "auto",
  },
});

const MainCard = styled(Paper)({
  position: "relative",
  overflow: "visible",
  backgroundColor: settingsPalette.paper,
  border: `3px solid ${settingsPalette.outline}`,
  borderRadius: 28,
  boxShadow: `7px 8px 0 ${settingsPalette.outline}`,
  padding: 16,
  "&::before": {
    content: '""',
    position: "absolute",
    top: -10,
    left: 28,
    width: 82,
    height: 22,
    borderRadius: 5,
    backgroundColor: "rgba(244, 181, 208, 0.86)",
    border: `2px solid ${settingsPalette.outline}`,
    transform: "rotate(-3deg)",
    pointerEvents: "none",
  },
});

const SectionCard = styled("section")({
  backgroundColor: settingsPalette.paper,
  border: `2px solid ${settingsPalette.outline}`,
  borderRadius: 22,
  boxShadow: "4px 5px 0 rgba(25, 25, 25, 0.92)",
  overflow: "hidden",
});

const SettingRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 0,
  minHeight: 72,
  padding: "12px 14px",
  border: "2px solid rgba(25, 25, 25, 0.16)",
  borderRadius: 18,
  backgroundColor: "rgba(255, 255, 255, 0.66)",
  transition: "background-color 200ms ease, transform 200ms ease",
  "&:hover": {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    transform: "translateY(-1px)",
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
  },
});

const FocusableButton = styled(Button)({
  minHeight: 44,
  borderRadius: 14,
  border: `2px solid ${settingsPalette.outline}`,
  boxShadow: "3px 3px 0 rgba(25, 25, 25, 0.92)",
  color: settingsPalette.ink,
  fontWeight: 900,
  lineHeight: 1.15,
  textTransform: "none",
  transition: "transform 150ms ease, box-shadow 150ms ease, background-color 150ms ease",
  "&:hover": {
    boxShadow: "2px 2px 0 rgba(25, 25, 25, 0.92)",
    transform: "translate(1px, 1px)",
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
  border: `2px solid ${settingsPalette.outline}`,
  borderRadius: 14,
  color: settingsPalette.ink,
  boxShadow: "2px 2px 0 rgba(25, 25, 25, 0.9)",
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

const marketVisibilityItems: Array<{ key: MarketVisibilityKey; labelKey: string }> = [
  { key: "cnn", labelKey: "cnn" },
  { key: "mm", labelKey: "mm" },
  { key: "nasdaq", labelKey: "nasdaq" },
  { key: "twse", labelKey: "twse" },
  { key: "otc", labelKey: "otc" },
  { key: "wtx", labelKey: "wtx" },
  { key: "margin", labelKey: "margin" },
];

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

  const [alwaysOnTop, setAlwaysOnTop] = useState(
    localStorage.getItem("slitenting-alwaysOnTop") === "true",
  );
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
  const [marketInfoOpen, setMarketInfoOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [indicatorOpen, setIndicatorOpen] = useState(false);
  const accountEmail = session?.user.email?.trim() || t("settings.accountUnknown");

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

  const activeLanguage = i18n.resolvedLanguage?.toLowerCase().startsWith("zh") ? "zh-TW" : "en";

  return (
    <PageContainer>
      <Box aria-hidden="true" sx={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <Box sx={{ position: "absolute", top: 132, right: "8%", width: 22, height: 22, border: `3px solid ${settingsPalette.outline}`, borderRadius: "50%", backgroundColor: settingsPalette.yellow }} />
        <Box sx={{ position: "absolute", top: 196, left: "5%", width: 60, height: 12, borderRadius: 99, backgroundColor: settingsPalette.blue, transform: "rotate(-12deg)" }} />
        <Box sx={{ position: "absolute", top: 205, left: "7%", width: 34, height: 7, borderRadius: 99, backgroundColor: settingsPalette.pink, transform: "rotate(-12deg)" }} />
        <Box sx={{ position: "absolute", bottom: 170, right: "5%", width: 42, height: 42, border: `3px solid ${settingsPalette.outline}`, borderRadius: "48% 52% 46% 54%", backgroundColor: settingsPalette.green, transform: "rotate(18deg)" }} />
      </Box>

      <Container
        component="main"
        maxWidth="md"
        sx={{
          position: "relative",
          width: "100%",
          px: { xs: 1.25, sm: 3, md: 4 },
          pt: { xs: 2, sm: 3.5 },
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
                backgroundColor: settingsPalette.yellow,
                border: `2px solid ${settingsPalette.outline}`,
                borderRadius: 14,
                boxShadow: "3px 3px 0 rgba(25, 25, 25, 0.92)",
                "&:hover": { backgroundColor: settingsPalette.yellow, transform: "translate(1px, 1px)", boxShadow: "2px 2px 0 rgba(25, 25, 25, 0.92)" },
                "&:focus-visible": { outline: `3px solid ${settingsPalette.blueDark}`, outlineOffset: 3 },
                "@media (prefers-reduced-motion: reduce)": { transition: "none" },
              }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography component="p" sx={{ color: settingsPalette.blueDark, fontSize: "0.72rem", fontWeight: 950, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                {t("settings.eyebrow")}
              </Typography>
              <Typography component="h1" sx={{ mt: 0.3, color: settingsPalette.ink, fontSize: { xs: "1.85rem", sm: "2.35rem" }, fontWeight: 950, letterSpacing: "-0.04em", lineHeight: 1 }}>
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
                      "&:hover": { backgroundColor: selected ? settingsPalette.blue : "#F4F0EA" },
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
          <SectionCard aria-labelledby="settings-application-heading" sx={{ mb: 2.25 }}>
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
                    sx={{ flex: 1, minWidth: { xs: 0, sm: 80 }, backgroundColor: stockBoxChartType === "tick" ? settingsPalette.blue : settingsPalette.white, "&:hover": { backgroundColor: stockBoxChartType === "tick" ? settingsPalette.blue : "#F4F0EA" } }}
                  >
                    {t("settings.live")}
                  </FocusableButton>
                  <FocusableButton
                    type="button"
                    onClick={() => setStockBoxChartType("mak")}
                    aria-pressed={stockBoxChartType === "mak"}
                    sx={{ flex: 1, minWidth: { xs: 0, sm: 104 }, backgroundColor: stockBoxChartType === "mak" ? settingsPalette.blue : settingsPalette.white, "&:hover": { backgroundColor: stockBoxChartType === "mak" ? settingsPalette.blue : "#F4F0EA" } }}
                  >
                    {t("settings.candle")}
                  </FocusableButton>
                </Stack>
              </SettingRow>
            </Stack>
          </SectionCard>

          <Stack spacing={2.25}>
            <DisclosureCard
              id="market-information"
              title={t("settings.marketInfo")}
              hint={t("settings.marketInfoSectionHint")}
              icon={<SettingsIcon fontSize="small" />}
              accent={settingsPalette.pink}
              open={marketInfoOpen}
              onToggle={() => setMarketInfoOpen((current) => !current)}
            >
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1 }}>
                {marketVisibilityItems.map(({ key, labelKey }) => {
                  const label = t(`settings.marketLabels.${labelKey}`);
                  return (
                    <Box key={key} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, minHeight: 56, px: 1.25, py: 0.65, border: "2px solid rgba(25, 25, 25, 0.14)", borderRadius: 15, backgroundColor: "rgba(244, 181, 208, 0.18)" }}>
                      <Typography component="span" sx={{ minWidth: 0, color: settingsPalette.ink, fontSize: "0.78rem", fontWeight: 850, lineHeight: 1.25, overflowWrap: "anywhere" }}>
                        {label}
                      </Typography>
                      <Switch
                        checked={marketVisibility[key]}
                        onChange={(event) => handleMarketVisibilityChange(key, event.target.checked)}
                        slotProps={{ input: { "aria-label": label } }}
                        sx={SwitchStyles}
                      />
                    </Box>
                  );
                })}
              </Box>
            </DisclosureCard>

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
              </Stack>
            </DisclosureCard>

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
                  <SettingRowText title={t("settings.accountEmail")} hint={accountEmail} />
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
