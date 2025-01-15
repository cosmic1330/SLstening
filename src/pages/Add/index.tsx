import { Box, Button, Container, Stack } from "@mui/material";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit } from "@tauri-apps/api/event";
import { useForm } from "react-hook-form";
import useStocksStore from "../../store/Stock.store";
import type FormData from "./type";
import Menu from "./Menu";
import { useEffect } from "react";

function Add() {
  const { increase, reload } = useStocksStore();

  const closeWindow = async () => {
    const webview = getCurrentWindow();
    webview.close();
  };

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    if (data.stock) {
      await reload();
      increase(data.stock);
      await emit("stock-added", { stockNumber: data.stock.id });
      reset();
    } else {
      console.log("未选择股票");
    }
  };

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
            Close
          </Button>
          <Button type="submit" variant="contained" size="small" fullWidth>
            Add
          </Button>
        </Stack>
      </form>
    </Container>
  );
}

export default Add;
