import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import useDownloadStocks from "../../hooks/useDownloadStocks";
import useStocksStore from "../../store/Stock.store";
import Menu from "./Menu";
import type FormData from "./type";
import { info } from "@tauri-apps/plugin-log";
import { t } from "i18next";

function Add() {
  const { increase, reload } = useStocksStore();
  const { handleDownloadMenu, disable } = useDownloadStocks();

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
      info(t("Pages.Add.noStock"));
    }
  }, []);

  const handleDownload = useCallback(async () => {
    await handleDownloadMenu();
    await reload();
  }, []);

  return (
    <Container>
      <form onSubmit={handleSubmit(onSubmit)} style={{ width: "100%" }}>
        <Box my={1}>
          <Menu {...{ control, errors }} />
        </Box>
        <Stack direction="row" spacing={2}>
          <Button size="small" onClick={closeWindow} fullWidth>
            {t("Pages.Add.close")}
          </Button>
          <Button type="submit" variant="contained" size="small" fullWidth>
            {t("Pages.Add.add")}
          </Button>
        </Stack>
      </form>
      <Box mt={2} textAlign="center">
        {disable ? (
          <Typography variant="caption">{t("Pages.Add.download")}</Typography>
        ) : (
          <Button
            onClick={handleDownload}
            color="primary"
            sx={{ cursor: "pointer", textDecoration: "underline" }}
          >
            {t("Pages.Add.notFoundOptions")}
          </Button>
        )}
      </Box>
    </Container>
  );
}

export default Add;
