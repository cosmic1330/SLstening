import {
  Box,
  Button,
  Container,
  Stack,
  TextField,
} from "@mui/material";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useForm, Controller } from "react-hook-form";

type FormData = {
  stockNumber: string;
};

function About() {
  const closeWindow = async () => {
    const webview = getCurrentWindow();
    webview.close();
  };
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  return (
    <Container>
      <form onSubmit={handleSubmit((data) => console.log(data))}>
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
          <Button
            size="small"
            onClick={closeWindow}
            fullWidth
          >
            Close
          </Button>
          <Button
            type="submit"
            variant="contained"
            size="small"
            fullWidth
          >
            Add
          </Button>
        </Stack>
      </form>
    </Container>
  );
}
export default About;
