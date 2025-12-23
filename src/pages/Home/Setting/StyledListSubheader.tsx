import { Typography, styled } from "@mui/material";

const StyledListSubheader = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(3, 3, 1, 3),
  color: "#90caf9",
  fontWeight: 700,
  fontSize: "0.75rem",
  letterSpacing: "0.1rem",
  textTransform: "uppercase",
}));

export default StyledListSubheader;
