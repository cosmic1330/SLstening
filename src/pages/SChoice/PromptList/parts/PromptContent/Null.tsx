import { Container, Typography } from "@mui/material";
import UpdateDeals from "../../../parts/UpdateDeals";

export default function Null() {
  return (
    <Container>
      <Typography variant="h6">No Data</Typography>
      <Typography variant="body1">Please download the data first.</Typography>
      <UpdateDeals />
    </Container>
  );
}
