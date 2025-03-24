import { Container } from "@mui/material";
import Version from "../../components/Version";
import Content from "./Content";

const Login = () => {
  return (
    <Container
      component="main"
      sx={{
        height: "100vh",
        width: "100%",
        background: `linear-gradient(to bottom, #a1c4fd, #c2e9fb, #ffb3b3)`, // 更柔和的漸層
        backgroundSize: "cover",
        display: "flex",
        alignItems: "center",
      }}
    >
     
      <Version />
      <Content />
      {/* <Auth /> */}
    </Container>
  );
};

export default Login;
