import {
  createTheme,
  Box,
  styled,
  ThemeProvider,
} from "@mui/material";
import Version from "../../components/Version";
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
    background: rgba(140, 100, 50, 0.1); 
    pointer-events: none;
    z-index: 1;
  }
`;

const Register = () => {
  return (
    <ThemeProvider
      theme={createTheme({
        palette: {
          mode: "light",
          primary: {
            main: "#3D5A45", // 林綠色
          },
          secondary: {
            main: "#D2691E", // 磚紅色
          },
        },
        typography: {
          fontFamily: '"Outfit", "Inter", -apple-system, sans-serif',
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: "8px",
                textTransform: "none",
                fontWeight: 700,
                boxShadow: "0 4px 0 rgba(0,0,0,0.1)",
                "&:hover": {
                  boxShadow: "0 2px 0 rgba(0,0,0,0.1)",
                  transform: "translateY(2px)",
                },
              },
            },
          },
        },
      })}
    >
      <Container>
        <Box sx={{ position: "relative", zIndex: 10, width: "100%", display: "flex", justifyContent: "center" }}>
          <Content />
        </Box>
        
        <Box sx={{ position: "absolute", bottom: 24, width: "100%", textAlign: "center", zIndex: 11 }}>
          <Version />
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default Register;
