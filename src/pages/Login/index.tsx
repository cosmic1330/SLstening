import { Box, styled, ThemeProvider } from "@mui/material";
import Version from "../../components/Version";
import { authTheme, primitiveTokens } from "../../theme";
import Content from "./Content";

const Container = styled(Box)`
  height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: url('/ghibli_bg.png') no-repeat center center;
  background-size: cover;
  position: relative; 
  overflow: hidden;

  /* 復古氛圍濾鏡 */
  &::after {
    content: "";
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(140, 100, 50, 0.1); // 輕微的琥珀色調
    pointer-events: none;
    z-index: 1;
  }
`;

const Login = () => {
  return (
    <ThemeProvider theme={authTheme}>
      <Container>
        <Box sx={{ position: "relative", zIndex: primitiveTokens.layer.raised, width: "100%", display: "flex", justifyContent: "center" }}>
          <Content />
        </Box>
        
        <Box sx={{ position: "absolute", bottom: 24, width: "100%", textAlign: "center", zIndex: primitiveTokens.layer.raised + 1 }}>
          <Version />
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default Login;
