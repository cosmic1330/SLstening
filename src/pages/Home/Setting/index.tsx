import {
  ArrowBackIosNew as ArrowBackIcon,
  BugReport as BugReportIcon,
  BarChart as ChartIcon,
  DeleteOutline as DeleteOutlineIcon,
  CloudDownload as DownloadIcon,
  DeleteForever as ResetIcon,
  Settings as SettingsIcon,
  Sync as SyncIcon,
  Layers as TopIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  Stack,
  styled,
  Switch,
  Typography,
} from "@mui/material";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { sendNotification } from "@tauri-apps/plugin-notification";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import useDownloadStocks from "../../../hooks/useDownloadStocks";
import useDebugStore from "../../../store/debug.store";
import useStocksStore from "../../../store/Stock.store";
import useUIStore from "../../../store/UI.store";
import IndicatorSettingsSection from "./IndicatorSettingsSection";
import StyledListSubheader from "./StyledListSubheader";
// Important: Make sure this path is correct or hardcode the version
import pkg from "../../../../package.json";

const VERSION = pkg.version || "0.1.0";

// --- Styled Components ---

const PageContainer = styled(Box)`
  width: 100%;
  height: 100vh;
  overflow: auto;
  position: relative;
  background: #fdf8f2;
  backgroundimage:
    radial-gradient(at 0% 0%, rgba(61, 90, 69, 0.05) 0, transparent 50%),
    radial-gradient(at 100% 100%, rgba(210, 105, 30, 0.05) 0, transparent 50%);
  color: #5d4037;
  padding-bottom: 80px;
`;

const GhibliNotebookPaper = styled(Paper)(({ theme }) => ({
  background: "#FAF3E0",
  borderRadius: "20px",
  border: "2px solid #5D4037",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
  overflow: "hidden",
  marginTop: theme.spacing(2),
}));

function Setting() {
  const {
    factory_reset,
    fetchSupabaseWatchStock,
    addStocks,
    removeSupabaseWatchStock,
    stocks,
    removeStocks,
  } = useStocksStore();
  const { handleDownloadMenu, disable } = useDownloadStocks();
  const navigate = useNavigate();
  const { stockBoxChartType, setStockBoxChartType } = useUIStore();

  const [syncLoading, setSyncLoading] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [pendingStocks, setPendingStocks] = useState<any[]>([]);
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteSelectedStocks, setDeleteSelectedStocks] = useState<string[]>(
    [],
  );

  const [alwaysOnTop, setAlwaysOnTop] = useState(
    localStorage.getItem("slitenting-alwaysOnTop") === "true",
  );
  const { isVisible: debugMode, toggleVisibility } = useDebugStore();
  const [marketVisibility, setMarketVisibility] = useState(() => {
    const saved = localStorage.getItem("slitenting-market-info-visibility");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        /* ignore */
      }
    }
    return {
      cnn: true,
      mm: true,
      nasdaq: true,
      twse: true,
      otc: true,
      wtx: true,
      margin: true,
    };
  });

  const handleAlwaysOnTopChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const checked = event.target.checked;
      setAlwaysOnTop(checked);
      localStorage.setItem("slitenting-alwaysOnTop", checked.toString());
      getCurrentWindow().setAlwaysOnTop(checked);
    },
    [],
  );

  const handleDebugModeChange = useCallback(() => {
    toggleVisibility();
  }, [toggleVisibility]);

  const handleMarketVisibilityChange = useCallback(
    (key: string, checked: boolean) => {
      setMarketVisibility((prev: any) => {
        const next = { ...prev, [key]: checked };
        localStorage.setItem(
          "slitenting-market-info-visibility",
          JSON.stringify(next),
        );
        return next;
      });
    },
    [],
  );

  const handleFactoryReset = useCallback(async () => {
    if (
      window.confirm("確定要清除所有資料並還原回原廠設定嗎？此動作無法復原。")
    ) {
      await factory_reset();
      sendNotification({ title: "原廠設定", body: "清除成功！" });
      window.location.reload();
    }
  }, [factory_reset]);

  const handleFetchSupabase = useCallback(async () => {
    try {
      setSyncLoading(true);
      const newStocks = await fetchSupabaseWatchStock();
      if (newStocks.length === 0) {
        sendNotification({ title: "同步", body: "沒有缺少的股票需要同步" });
      } else {
        setPendingStocks(newStocks);
        setSelectedStocks(newStocks.map((s) => s.id));
        setSyncDialogOpen(true);
      }
    } catch (e) {
      console.error(e);
      sendNotification({ title: "錯誤", body: "同步失敗" });
    } finally {
      setSyncLoading(false);
    }
  }, [fetchSupabaseWatchStock]);

  const handleConfirmSync = useCallback(async () => {
    const stocksToAdd = pendingStocks.filter((s) =>
      selectedStocks.includes(s.id),
    );
    if (stocksToAdd.length > 0) {
      await addStocks(stocksToAdd);
      sendNotification({
        title: "同步成功",
        body: `已新增 ${stocksToAdd.length} 檔股票`,
      });
    }
    setSyncDialogOpen(false);
  }, [pendingStocks, selectedStocks, addStocks]);

  const handleToggleSelectAll = () => {
    if (selectedStocks.length === pendingStocks.length) {
      setSelectedStocks([]);
    } else {
      setSelectedStocks(pendingStocks.map((s) => s.id));
    }
  };

  const handleToggleStock = (id: string) => {
    setSelectedStocks((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleDeleteCloudStock = useCallback(
    async (id: string, name: string) => {
      if (window.confirm(`確定要從雲端同步清單中刪除 ${id} ${name} 嗎？`)) {
        try {
          await removeSupabaseWatchStock(id);
          setPendingStocks((prev) => prev.filter((s) => s.id !== id));
          setSelectedStocks((prev) => prev.filter((i) => i !== id));
          sendNotification({ title: "刪除成功", body: `已從雲端移除 ${name}` });
        } catch (e) {
          console.error(e);
          sendNotification({ title: "錯誤", body: "刪除失敗" });
        }
      }
    },
    [removeSupabaseWatchStock],
  );

  const handleOpenDeleteDialog = useCallback(() => {
    setDeleteSelectedStocks([]);
    setDeleteDialogOpen(true);
  }, []);

  const handleToggleDeleteSelectAll = useCallback(() => {
    if (deleteSelectedStocks.length === stocks.length) {
      setDeleteSelectedStocks([]);
    } else {
      setDeleteSelectedStocks(stocks.map((s) => s.id));
    }
  }, [deleteSelectedStocks, stocks]);

  const handleToggleDeleteStock = useCallback((id: string) => {
    setDeleteSelectedStocks((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (deleteSelectedStocks.length > 0) {
      if (
        window.confirm(
          `確定要從本地刪除選中的 ${deleteSelectedStocks.length} 檔股票嗎？`,
        )
      ) {
        await removeStocks(deleteSelectedStocks);
        sendNotification({
          title: "刪除成功",
          body: `已刪除 ${deleteSelectedStocks.length} 檔股票`,
        });
        setDeleteDialogOpen(false);
      }
    }
  }, [deleteSelectedStocks, removeStocks]);

  const switchStyles = {
    "& .MuiSwitch-switchBase.Mui-checked": { color: "#3D5A45" },
    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
      backgroundColor: "#3D5A45",
    },
  };

  return (
    <PageContainer>
      <Container maxWidth="sm" sx={{ pt: 4 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <IconButton
            onClick={() => navigate("/dashboard")}
            sx={{
              color: "#5D4037",
              background: "rgba(93, 64, 55, 0.05)",
              borderRadius: "10px",
              border: "1.5px solid #D2B48C",
            }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Typography variant="h5" fontWeight="900" sx={{ color: "#5D4037" }}>
            偏好設定
          </Typography>
        </Stack>

        <GhibliNotebookPaper elevation={0}>
          <List disablePadding>
            <StyledListSubheader>資料管理</StyledListSubheader>

            <ListItem>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <DownloadIcon sx={{ color: "#8B7355" }} />
              </ListItemIcon>
              <ListItemText
                primary="更新股票列表"
                secondary="手動觸發台股資料庫更新"
                primaryTypographyProps={{ fontWeight: 800, color: "#5D4037" }}
                secondaryTypographyProps={{
                  color: "#8B7355",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              />
              <ListItemSecondaryAction>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleDownloadMenu}
                  disabled={disable}
                  sx={{
                    borderRadius: "10px",
                    borderColor: "#3D5A45",
                    color: "#3D5A45",
                    fontWeight: 800,
                    borderWidth: "2px",
                    "&:hover": {
                      borderWidth: "2px",
                      borderColor: "#3D5A45",
                      background: "rgba(61, 90, 69, 0.05)",
                    },
                  }}
                >
                  {disable ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    "更新"
                  )}
                </Button>
              </ListItemSecondaryAction>
            </ListItem>

            <Divider sx={{ mx: 2, borderColor: "rgba(93, 64, 55, 0.1)" }} />

            <ListItem>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <SyncIcon sx={{ color: "#3D5A45" }} />
              </ListItemIcon>
              <ListItemText
                primary="同步Schoice自選股票"
                secondary="加入雲端自選股票列表"
                primaryTypographyProps={{ fontWeight: 800, color: "#5D4037" }}
                secondaryTypographyProps={{
                  color: "#8B7355",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              />
              <ListItemSecondaryAction>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleFetchSupabase}
                  disabled={syncLoading}
                  sx={{
                    borderRadius: "10px",
                    borderColor: "#3D5A45",
                    color: "#3D5A45",
                    fontWeight: 800,
                    borderWidth: "2px",
                    "&:hover": {
                      borderWidth: "2px",
                      borderColor: "#3D5A45",
                      background: "rgba(61, 90, 69, 0.05)",
                    },
                  }}
                >
                  {syncLoading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    "同步"
                  )}
                </Button>
              </ListItemSecondaryAction>
            </ListItem>

            <Divider sx={{ mx: 2, borderColor: "rgba(93, 64, 55, 0.1)" }} />

            <ListItem>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <DeleteOutlineIcon sx={{ color: "#E53935" }} />
              </ListItemIcon>
              <ListItemText
                primary="批次刪除自選股"
                secondary="快速挑選並刪除不再追蹤的股票"
                primaryTypographyProps={{ fontWeight: 800, color: "#E53935" }}
                secondaryTypographyProps={{
                  color: "#8B7355",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              />
              <ListItemSecondaryAction>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleOpenDeleteDialog}
                  sx={{
                    borderRadius: "10px",
                    borderColor: "#E53935",
                    color: "#E53935",
                    fontWeight: 800,
                    borderWidth: "2px",
                    "&:hover": {
                      borderWidth: "2px",
                      borderColor: "#E53935",
                      background: "rgba(229, 57, 53, 0.05)",
                    },
                  }}
                >
                  挑選
                </Button>
              </ListItemSecondaryAction>
            </ListItem>

            <Divider sx={{ mx: 2, borderColor: "rgba(93, 64, 55, 0.1)" }} />

            <ListItem>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <ResetIcon sx={{ color: "#D2691E" }} />
              </ListItemIcon>
              <ListItemText
                primary="回到原廠設定"
                secondary="清除快取並重設資料庫"
                primaryTypographyProps={{ fontWeight: 800, color: "#D2691E" }}
                secondaryTypographyProps={{
                  color: "#8B7355",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              />
              <ListItemSecondaryAction>
                <Button
                  variant="text"
                  size="small"
                  color="error"
                  onClick={handleFactoryReset}
                  sx={{ borderRadius: "10px", fontWeight: 800 }}
                >
                  執行
                </Button>
              </ListItemSecondaryAction>
            </ListItem>

            <StyledListSubheader>應用程式</StyledListSubheader>

            <ListItem>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <TopIcon sx={{ color: "#8B7355" }} />
              </ListItemIcon>
              <ListItemText
                primary="視窗置頂"
                secondary="保持視窗顯示在最前方"
                primaryTypographyProps={{ fontWeight: 800, color: "#5D4037" }}
                secondaryTypographyProps={{
                  color: "#8B7355",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={alwaysOnTop}
                  onChange={handleAlwaysOnTopChange}
                  sx={switchStyles}
                />
              </ListItemSecondaryAction>
            </ListItem>

            <Divider sx={{ mx: 2, borderColor: "rgba(93, 64, 55, 0.1)" }} />

            <ListItem>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <ChartIcon sx={{ color: "#3D5A45" }} />
              </ListItemIcon>
              <ListItemText
                primary="卡片圖表顯示"
                secondary="切換首頁股票卡片底部的圖表類型"
                primaryTypographyProps={{ fontWeight: 800, color: "#5D4037" }}
                secondaryTypographyProps={{
                  color: "#8B7355",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              />
              <ListItemSecondaryAction>
                <Stack alignItems="center">
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#3D5A45",
                      fontWeight: 700,
                    }}
                  >
                    {stockBoxChartType === "mak" ? "K線" : "即時"}
                  </Typography>
                  <Switch
                    checked={stockBoxChartType === "mak"}
                    onChange={(e) =>
                      setStockBoxChartType(e.target.checked ? "mak" : "tick")
                    }
                    sx={switchStyles}
                  />
                </Stack>
              </ListItemSecondaryAction>
            </ListItem>

            <Divider sx={{ mx: 2, borderColor: "rgba(93, 64, 55, 0.1)" }} />

            <ListItem>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <SettingsIcon sx={{ color: "#3D5A45" }} />
              </ListItemIcon>
              <ListItemText
                primary="顯示大盤資訊"
                secondary="首頁顯示指數與市場概況"
                primaryTypographyProps={{ fontWeight: 800, color: "#5D4037" }}
                secondaryTypographyProps={{
                  color: "#8B7355",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              />
            </ListItem>

            <Divider sx={{ mx: 2, borderColor: "rgba(93, 64, 55, 0.1)" }} />

            <ListItem>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <BugReportIcon sx={{ color: "#D2B48C" }} />
              </ListItemIcon>
              <ListItemText
                primary="開發者模式"
                secondary="顯示內部除錯資訊 (可使用 Ctrl + Shift + D 切換)"
                primaryTypographyProps={{ fontWeight: 800, color: "#5D4037" }}
                secondaryTypographyProps={{
                  color: "#8B7355",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={debugMode}
                  onChange={handleDebugModeChange}
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": { color: "#D2B48C" },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                      backgroundColor: "#D2B48C",
                    },
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>

            <Divider
              sx={{ mx: 2, mb: 2, borderColor: "rgba(93, 64, 55, 0.1)" }}
            />

            {/* Granular market settings */}
            <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
              <Grid container spacing={1}>
                {[
                  { key: "cnn", label: "CNN 恐懼貪婪" },
                  { key: "mm", label: "財經 M 平方" },
                  { key: "nasdaq", label: "NASDAQ 指數" },
                  { key: "twse", label: "台股加權指數" },
                  { key: "otc", label: "櫃買指數" },
                  { key: "wtx", label: "台指期貨" },
                  { key: "margin", label: "台股融資維持率" },
                ].map((item) => (
                  <Grid size={6} key={item.key}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "rgba(93, 64, 55, 0.05)",
                        p: "4px 8px",
                        borderRadius: "8px",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ color: "#8B7355", fontWeight: 800 }}
                      >
                        {item.label}
                      </Typography>
                      <Switch
                        size="small"
                        checked={(marketVisibility as any)[item.key]}
                        onChange={(e) =>
                          handleMarketVisibilityChange(
                            item.key,
                            e.target.checked,
                          )
                        }
                        sx={switchStyles}
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <IndicatorSettingsSection />
          </List>
        </GhibliNotebookPaper>

        <Stack
          alignItems="center"
          spacing={1}
          sx={{ mt: 6, mb: 4, opacity: 0.6 }}
        >
          <SettingsIcon sx={{ fontSize: 32, color: "#8B7355" }} />
          <Typography
            variant="body2"
            sx={{ letterSpacing: "1px", color: "#8B7355", fontWeight: 900 }}
          >
            SLSTEN PROJECT
          </Typography>
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: "8px",
              background: "rgba(93, 64, 55, 0.05)",
              border: "1px solid #D2B48C",
            }}
          >
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, color: "#5D4037" }}
            >
              v{VERSION}
            </Typography>
          </Box>
        </Stack>
      </Container>

      <Dialog
        open={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
        PaperProps={{
          sx: {
            background: "#FAF3E0",
            borderRadius: "24px",
            border: "2px solid #5D4037",
            color: "#5D4037",
            minWidth: "320px",
            backgroundImage: "none",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: "#5D4037" }}>
          同步缺少的股票
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={selectedStocks.length === pendingStocks.length}
                  indeterminate={
                    selectedStocks.length > 0 &&
                    selectedStocks.length < pendingStocks.length
                  }
                  onChange={handleToggleSelectAll}
                  sx={{
                    color: "#8B7355",
                    "&.Mui-checked": { color: "#3D5A45" },
                  }}
                />
              }
              label={
                <Typography
                  variant="body2"
                  sx={{ color: "#5D4037", fontWeight: 700 }}
                >
                  全選
                </Typography>
              }
            />
          </Box>
          <List dense sx={{ maxHeight: "300px", overflow: "auto" }}>
            {pendingStocks.map((stock) => (
              <ListItem
                key={stock.id}
                disablePadding
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    size="small"
                    onClick={() => handleDeleteCloudStock(stock.id, stock.name)}
                    sx={{ color: "#D2691E" }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                }
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={selectedStocks.includes(stock.id)}
                      onChange={() => handleToggleStock(stock.id)}
                      sx={{
                        color: "#8B7355",
                        "&.Mui-checked": { color: "#3D5A45" },
                      }}
                    />
                  }
                  label={
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, color: "#5D4037" }}
                    >
                      {stock.id} - {stock.name}
                    </Typography>
                  }
                  sx={{ width: "100%", ml: 0, mr: 0 }}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions sx={{ p: 4 }}>
          <Button
            onClick={() => setSyncDialogOpen(false)}
            sx={{
              color: "#8B7355",
              fontWeight: 800,
              textDecoration: "underline",
            }}
          >
            取消
          </Button>
          <Button
            onClick={handleConfirmSync}
            variant="contained"
            disabled={selectedStocks.length === 0}
            sx={{
              borderRadius: "12px",
              background: "#3D5A45",
              color: "#F1E5AC",
              fontWeight: 900,
              border: "2px solid #2D4A35",
              boxShadow: "0 4px 0 #2D4A35",
              "&:hover": {
                background: "#3D5A45",
                transform: "translateY(2px)",
                boxShadow: "0 2px 0 #2D4A35",
              },
            }}
          >
            確認新增 ({selectedStocks.length})
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            background: "#FAF3E0",
            borderRadius: "24px",
            border: "2px solid #5D4037",
            color: "#5D4037",
            minWidth: "320px",
            backgroundImage: "none",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: "#E53935" }}>
          批次刪除自選股
        </DialogTitle>
        <DialogContent>
          {stocks.length === 0 ? (
            <Typography variant="body2" sx={{ color: "#8B7355", mt: 2 }}>
              目前沒有追蹤任何股票
            </Typography>
          ) : (
            <>
              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={
                        deleteSelectedStocks.length === stocks.length &&
                        stocks.length > 0
                      }
                      indeterminate={
                        deleteSelectedStocks.length > 0 &&
                        deleteSelectedStocks.length < stocks.length
                      }
                      onChange={handleToggleDeleteSelectAll}
                      sx={{
                        color: "#8B7355",
                        "&.Mui-checked": { color: "#E53935" },
                      }}
                    />
                  }
                  label={
                    <Typography
                      variant="body2"
                      sx={{ color: "#5D4037", fontWeight: 700 }}
                    >
                      全選
                    </Typography>
                  }
                />
              </Box>
              <List dense sx={{ maxHeight: "300px", overflow: "auto" }}>
                {stocks.map((stock) => (
                  <ListItem key={stock.id} disablePadding>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={deleteSelectedStocks.includes(stock.id)}
                          onChange={() => handleToggleDeleteStock(stock.id)}
                          sx={{
                            color: "#8B7355",
                            "&.Mui-checked": { color: "#E53935" },
                          }}
                        />
                      }
                      label={
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, color: "#5D4037" }}
                        >
                          {stock.id} - {stock.name}
                        </Typography>
                      }
                      sx={{ width: "100%", ml: 0, mr: 0 }}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 4 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            sx={{
              color: "#8B7355",
              fontWeight: 800,
              textDecoration: "underline",
            }}
          >
            取消
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            disabled={deleteSelectedStocks.length === 0}
            sx={{
              borderRadius: "12px",
              background: "#E53935",
              color: "#FFF",
              fontWeight: 900,
              border: "2px solid #B71C1C",
              boxShadow: "0 4px 0 #B71C1C",
              "&:hover": {
                background: "#D32F2F",
                transform: "translateY(2px)",
                boxShadow: "0 2px 0 #B71C1C",
              },
            }}
          >
            確認刪除 ({deleteSelectedStocks.length})
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}

export default Setting;
