import { Button, Typography, Container, Stack } from "@mui/material";
import { useNavigate } from "react-router";
import useStocksStore from "../store/Stock.store";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback } from "react";

const Login = () => {
  const { alwaysOnTop } = useStocksStore();
  let navigate = useNavigate();

  const handleLogin = useCallback(() => {
    getCurrentWindow().setAlwaysOnTop(alwaysOnTop);
    navigate("/dashboard");
  }, [alwaysOnTop]);

  return (
    <Container
      component="main"
      sx={{
        height: "100vh",
        width: "100%",
        background: `linear-gradient(to bottom, #a1c4fd, #c2e9fb, #ffb3b3)`, // 更柔和的漸層
        backgroundSize: "cover",
      }}
    >
      <Stack
        justifyContent="center"
        alignItems="center"
        spacing={2}
        height="100%"
      >
        <Typography component="h1" variant="h5">
          SListening
        </Typography>
        <Button fullWidth variant="contained" onClick={handleLogin}>
          進入
        </Button>
      </Stack>
    </Container>
  );
};

export default Login;
