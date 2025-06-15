import { Backup, CheckCircle, Storage } from "@mui/icons-material";
import {
  Box,
  Card,
  CardContent,
  Grid2,
  Stack,
  Typography,
} from "@mui/material";

export default function SystemStatus() {
  return (
    <Box mt={5}>
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" mb={2}>
            系統狀態
          </Typography>
          <Grid2 container spacing={2}>
            <Grid2 size={{ xs: 12, md: 4 }}>
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
            </Grid2>
            <Grid2 size={{ xs: 12, md: 4 }}>
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
            </Grid2>
            <Grid2 size={{ xs: 12, md: 4 }}>
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
            </Grid2>
          </Grid2>
        </CardContent>
      </Card>
    </Box>
  );
}
