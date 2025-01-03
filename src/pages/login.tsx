import { Box, Button, Typography, Grid2, Link } from "@mui/material";
import { useNavigate } from "react-router";

const Login = () => {
  let navigate = useNavigate();
  return (
    <main
      style={{
        height: "100vh",
        width: "100%",
        background: `linear-gradient(to bottom, #a1c4fd, #c2e9fb, #ffb3b3)`, // 更柔和的漸層
        backgroundSize: "cover",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: '100%'
        }}
      >
        <Typography component="h1" variant="h5">
          SListening
        </Typography>
        <Box component="form" noValidate sx={{ mt: 1 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => {
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
                {"還沒有帳號？立即註冊"}
              </Link>
            </Grid2>
          </Grid2>
        </Box>
      </Box>
    </main>
  );
};

export default Login;
