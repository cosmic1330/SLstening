import {
  Backup,
  Build,
  Cached,
  CheckCircle,
  Delete,
  Settings,
  Storage,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Container,
  Grid,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { useState } from "react";

export default function Setting() {
  const [autoClear, setAutoClear] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [debug, setDebug] = useState(false);
  const [disableNoti, setDisableNoti] = useState(false);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        系統管理
      </Typography>
      <Grid container spacing={3}>
        {/* Database Repair */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <Build color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  資料庫修復
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" mb={2}>
                掃描並修復資料庫結構與紀錄的不一致。依資料庫大小，過程可能需數分鐘。
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Settings />}
                fullWidth
              >
                開始修復
              </Button>
            </CardActions>
          </Card>
        </Grid>
        {/* Database Deletion */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <Delete color="error" />
                <Typography variant="h6" fontWeight="bold">
                  資料庫刪除
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" mb={2}>
                永久刪除資料庫及所有內容。此操作無法復原，請先備份。
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                color="error"
                startIcon={<Delete />}
                fullWidth
              >
                刪除資料庫
              </Button>
            </CardActions>
          </Card>
        </Grid>
        {/* Cache Management */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <Cached color="warning" />
                <Typography variant="h6" fontWeight="bold">
                  快取管理
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" mb={2}>
                清除系統快取以釋放空間並解決效能問題，不影響資料。
              </Typography>
            </CardContent>
            <CardActions
              sx={{ flexDirection: "column", alignItems: "flex-start", gap: 1 }}
            >
              <Button
                variant="contained"
                color="warning"
                startIcon={<Cached />}
              >
                清除快取
              </Button>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Switch
                  checked={autoClear}
                  onChange={(e) => setAutoClear(e.target.checked)}
                  color="warning"
                />
                <Typography variant="body2">每日自動清除快取</Typography>
              </Stack>
            </CardActions>
          </Card>
        </Grid>
        {/* Temporary Settings */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <Settings color="success" />
                <Typography variant="h6" fontWeight="bold">
                  暫時設定
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" mb={2}>
                設定暫時性系統選項，將於指定時間或重啟後還原。
              </Typography>
              <Stack spacing={1} mt={2}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Switch
                    checked={maintenance}
                    onChange={(e) => setMaintenance(e.target.checked)}
                    color="success"
                  />
                  <Typography variant="body2">維護模式</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Switch
                    checked={debug}
                    onChange={(e) => setDebug(e.target.checked)}
                    color="success"
                  />
                  <Typography variant="body2">除錯模式</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Switch
                    checked={disableNoti}
                    onChange={(e) => setDisableNoti(e.target.checked)}
                    color="success"
                  />
                  <Typography variant="body2">停用通知</Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {/* System Status */}
      <Box mt={5}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight="bold" mb={2}>
              系統狀態
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CheckCircle color="success" />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      資料庫狀態：
                      <span style={{ color: "#2ecc40" }}>Online</span>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      2 分鐘前檢查
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
              <Grid item xs={12} md={4}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Storage color="primary" />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      資料庫大小：1.2 GB
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      4,328 筆紀錄
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
              <Grid item xs={12} md={4}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Backup color="secondary" />
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      最後備份：昨天 23:42
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      今日已排程自動備份
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}
