import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit } from "@tauri-apps/api/event";
import { useForm } from "react-hook-form";
import useStocksStore from "../../store/Stock.store";
import type FormData from "./type";
import Menu from "./Menu";
import { useCallback, useEffect, useState } from "react";
import useDownloadStocks from "../../hooks/useDownloadStocks";

enum StateType {
  Default = "default",
  Downloading = "downloading",
}
function Add() {
  const { increase, reload } = useStocksStore();
  const [state, setState] = useState(StateType.Default);
  const handleDownloadMenu = useDownloadStocks();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>();

  const closeWindow = useCallback(async () => {
    const webview = getCurrentWindow();
    webview.close();
  }, []);

  const onSubmit = useCallback(async (data: FormData) => {
    if (data.stock) {
      await reload();
      increase(data.stock);
      await emit("stock-added", { stockNumber: data.stock.id });
      reset();
    } else {
      console.log("未选择股票");
    }
  }, []);

  const handleDownload = useCallback(async () => {
    setState(StateType.Downloading);
    await handleDownloadMenu();
    await reload();
    setState(StateType.Default);
  }, []);

  useEffect(() => {
    reload();
    console.log("reload");
  }, []);

  return (
    <Container>
      <form onSubmit={handleSubmit(onSubmit)} style={{ width: "100%" }}>
        <Box my={1}>
          <Menu {...{ control, errors }} />
        </Box>
        <Stack direction="row" spacing={2}>
          <Button size="small" onClick={closeWindow} fullWidth>
            關閉
          </Button>
          <Button type="submit" variant="contained" size="small" fullWidth>
            加入
          </Button>
        </Stack>
      </form>
      <Box mt={2} textAlign="center">
        {state === StateType.Default ? (
          <Button
            onClick={handleDownload}
            color="primary"
            sx={{ cursor: "pointer", textDecoration: "underline" }}
          >
            沒有選項嗎? 點我載入
          </Button>
        ) : (
          <Typography variant="caption">下載中...</Typography>
        )}
      </Box>
    </Container>
  );
}

export default Add;
