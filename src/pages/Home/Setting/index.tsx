import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import DownloadIcon from "@mui/icons-material/Download";
import EmojiNatureIcon from "@mui/icons-material/EmojiNature";
import {
  Button,
  Container,
  Grid,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { sendNotification } from "@tauri-apps/plugin-notification";
import { useCallback } from "react";
import { useNavigate } from "react-router";
import useDownloadStocks from "../../../hooks/useDownloadStocks";
import useStocksStore from "../../../store/Stock.store";

function Setting() {
  const { factory_reset } = useStocksStore();
  const { handleDownloadMenu, disable } = useDownloadStocks();
  let navigate = useNavigate();

  const handleAlwaysOnTopChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      localStorage.setItem(
        "slitenting-alwaysOnTop",
        event.target.checked.toString()
      );
      getCurrentWindow().setAlwaysOnTop(event.target.checked);
    },
    []
  );

  const handleFactoryReset = useCallback(async () => {
    await factory_reset();
    sendNotification({ title: "Factory Reset", body: "Reset Success!" });
  }, []);

  return (
    <Container
      sx={{
        background: "rgba(100,100,100,.5)",
        height: "100vh",
        color: "white",
      }}
    >
      <Stack height="100%" justifyContent="center" spacing={4}>
        <Grid container spacing={1}>
          <Grid size={6} display="flex" alignItems="center">
            <DownloadIcon />
            <Typography variant="body1" fontWeight="bold" ml={1}>
              更新股票列表
            </Typography>
          </Grid>
          <Grid
            size={6}
            justifyContent="flex-end"
            display="flex"
            alignItems="center"
          >
            <Button
              color="success"
              variant="contained"
              size="small"
              onClick={handleDownloadMenu}
              disabled={disable}
            >
              {disable ? "執行中..." : "更新"}
            </Button>
          </Grid>

          <Grid size={6} display="flex" alignItems="center">
            <EmojiNatureIcon />
            <Typography variant="body1" fontWeight="bold" ml={1}>
              視窗置頂
            </Typography>
          </Grid>
          <Grid
            size={6}
            justifyContent="flex-end"
            display="flex"
            alignItems="center"
          >
            <Switch
              defaultChecked={
                localStorage.getItem("slitenting-alwaysOnTop") === "true"
              }
              onChange={handleAlwaysOnTopChange}
            />
          </Grid>

          <Grid size={6} display="flex" alignItems="center">
            <EmojiNatureIcon />
            <Typography variant="body1" fontWeight="bold" ml={1}>
              回到原廠設定
            </Typography>
          </Grid>
          <Grid
            size={6}
            justifyContent="flex-end"
            display="flex"
            alignItems="center"
          >
            <Button
              color="error"
              variant="contained"
              size="small"
              onClick={handleFactoryReset}
            >
              清除資料
            </Button>
          </Grid>
        </Grid>
        <Button
          variant="contained"
          size="small"
          onClick={() => {
            navigate("/dashboard");
          }}
          startIcon={<ArrowBackIosNewIcon />}
        >
          回到追蹤列表
        </Button>
      </Stack>
    </Container>
  );
}
export default Setting;
