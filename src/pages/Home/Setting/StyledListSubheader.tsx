import { Typography, styled } from "@mui/material";

const StyledListSubheader = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(3, 3, 1, 3),
  color: "#5D4037",
  fontWeight: 900,
  fontSize: "0.85rem",
  letterSpacing: "0.1rem",
  textTransform: "uppercase",
}));

export default StyledListSubheader;
