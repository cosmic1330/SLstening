import {
  Container,
  Button,
  Grid2,
  Stack,
  Typography,
  Switch,
} from "@mui/material";
import { useNavigate } from "react-router";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import EmojiNatureIcon from "@mui/icons-material/EmojiNature";
import useStocksStore from "../../store/Stock.store";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback } from "react";
import { sendNotification } from "@tauri-apps/plugin-notification";

function Other() {
  const { alwaysOnTop, set_always_on_top, factory_reset } = useStocksStore();
  let navigate = useNavigate();

  const handleAlwaysOnTopChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      set_always_on_top(event.target.checked);
      getCurrentWindow().setAlwaysOnTop(event.target.checked);
    },
    []
  );

  const handleFactoryReset = useCallback(async () => {
    await factory_reset();
    sendNotification({ title: "Factory Reset", body: "Reset Success!" });
  }, []);

  return (
    <Container sx={{ background: "rgba(255,255,255,.6)", height: "100vh" }}>
      <Stack height="100%" justifyContent="center" spacing={4}>
        <Grid2 container spacing={1}>
          <Grid2 size={6} display="flex" alignItems="center">
            <EmojiNatureIcon />
            <Typography variant="body1" fontWeight="bold" ml={1}>
              視窗置頂
            </Typography>
          </Grid2>
          <Grid2
            size={6}
            justifyContent="flex-end"
            display="flex"
            alignItems="center"
          >
            <Switch
              defaultChecked={alwaysOnTop}
              onChange={handleAlwaysOnTopChange}
            />
          </Grid2>

          <Grid2 size={6} display="flex" alignItems="center">
            <EmojiNatureIcon />
            <Typography variant="body1" fontWeight="bold" ml={1}>
              回到原廠設定
            </Typography>
          </Grid2>
          <Grid2
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
              強制執行
            </Button>
          </Grid2>
        </Grid2>
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
export default Other;
