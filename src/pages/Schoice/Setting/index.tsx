import { Container, Grid2, Typography } from "@mui/material";
import CacheManagement from "./CacheManagement";
import DatabaseDeletion from "./DatabaseDeletion";
import DatabaseRepair from "./DatabaseRepair";
import OtherSettings from "./OtherSettings";
import SystemStatus from "./SystemStatus";

export default function Setting() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        系統管理
      </Typography>
      <Grid2 container spacing={3}>
        <DatabaseRepair />
        <DatabaseDeletion />
        <CacheManagement />
        <OtherSettings />
      </Grid2>
      <SystemStatus />
    </Container>
  );
}
