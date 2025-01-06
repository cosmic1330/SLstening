import { Box, Button, Container, Stack, TextField } from "@mui/material";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit } from "@tauri-apps/api/event";
import { Controller, useForm } from "react-hook-form";
import useStocksStore from "../store/Stock.store";

type FormData = {
  stockNumber: string;
};

function Add() {
  const { increase } = useStocksStore();
  const closeWindow = async () => {
    const webview = getCurrentWindow();
    webview.close();
  };

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    increase(data.stockNumber);
    // 发送事件通知主窗口
    await emit("stock-added", { stockNumber: data.stockNumber });
    closeWindow();
  };

  return (
    <Container sx={{ height: "100vh" }}>
      <Stack alignItems="center" justifyContent="center" height="100%">
        <form onSubmit={handleSubmit(onSubmit)}>
          <Box>
            <Controller
              name="stockNumber"
              control={control}
              defaultValue=""
              rules={{
                required: "股票代號是必填項目",
                pattern: {
                  value: /^\d{4}$/,
                  message: "股票代號格式不正確",
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Stock Number"
                  variant="outlined"
                  fullWidth
                  margin="normal"
                  size="small"
                  error={!!errors.stockNumber}
                  helperText={errors.stockNumber?.message}
                />
              )}
            />
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
      </Stack>
    </Container>
  );
}

export default Add;
