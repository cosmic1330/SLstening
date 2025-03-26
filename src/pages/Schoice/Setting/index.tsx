import { Button, Container, Grid2, Typography } from "@mui/material";
import { useNavigate } from "react-router";
import ClearTable from "./ClearTable";
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
      <Grid2 container spacing={2} width="50%">
        <Grid2 size={12}>
          <Typography variant="h5" fontWeight="bold">
            設定
          </Typography>
        </Grid2>
        <Grid2 size={12} mt={5}>
          <RollBackDay />
        </Grid2>
        <Grid2 size={12}>
          <ClearTable />
        </Grid2>
        <Grid2 size={12} mt={5}>
          <Button
            onClick={() => navigate("/schoice")}
            variant="contained"
            size="large"
            fullWidth
          >
            確定
          </Button>
        </Grid2>
      </Grid2>
    </Container>
  );
}
