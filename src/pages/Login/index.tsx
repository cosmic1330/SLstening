import {
  createTheme,
  Container as MuiContainer,
  styled,
  ThemeProvider,
  Box,
} from "@mui/material";
import Version from "../../components/Version";
import Content from "./Content";
import LanguageSwitcher from "../../components/LanguageSwitcher";

const Container = styled(MuiContainer)`
  min-height: 100vh;
  width: 100%;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #0f1214;
  background-image: 
    radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), 
    radial-gradient(at 50% 0%, hsla(225,39%,25%,1) 0, transparent 50%), 
    radial-gradient(at 100% 0%, hsla(339,49%,25%,1) 0, transparent 50%),
    url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E");
  background-size: 100% 100%, 100% 100%, 100% 100%, 200px 200px;
  background-repeat: no-repeat, no-repeat, no-repeat, repeat;
  position: relative; 
`;

const Login = () => {
  return (
    <ThemeProvider
      theme={createTheme({
        palette: {
          mode: "dark",
        },
      })}
    >
      <Container>
        <Box sx={{ position: "absolute", top: 24, right: 24, color: "white" }}>
            <LanguageSwitcher />
        </Box>
        <Version />
        <Content />
      </Container>
    </ThemeProvider>
  );
};

export default Login;
