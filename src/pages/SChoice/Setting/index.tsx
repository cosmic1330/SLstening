import { Box, Button, Container, Typography } from "@mui/material";
import { useNavigate } from "react-router";
import RollBackDay from "./RollBackDay";

export default function Setting() {
  const navigate = useNavigate();

  return (
    <Container
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
      }}
    >
      <Box>
        <Typography variant="h5">設定</Typography>
      </Box>
      <RollBackDay />

      <Button
        onClick={() => navigate("/schoice")}
        variant="contained"
        size="large"
      >
        確定
      </Button>
    </Container>
  );
}
