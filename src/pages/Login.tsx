import {
  Button,
  Typography,
  Grid2,
  Link,
  Container,
  Stack,
} from "@mui/material";
import { useNavigate } from "react-router";
import useStocksStore from "../store/Stock.store";

const Login = () => {
  const { reload } = useStocksStore();
  let navigate = useNavigate();
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
        <Button
          fullWidth
          variant="contained"
          onClick={() => {
            reload();
            navigate("/dashboard");
          }}
        >
          登入
        </Button>
        <Grid2 container>
          <Grid2 size={6}>
            <Link href="#" variant="body2">
              忘記密碼？
            </Link>
          </Grid2>
          <Grid2 size={6}>
            <Link href="#" variant="body2">
              {"還沒有帳號？\n 立即註冊"}
            </Link>
          </Grid2>
        </Grid2>
      </Stack>
    </Container>
  );
};

export default Login;
