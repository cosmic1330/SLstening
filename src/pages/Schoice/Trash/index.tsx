import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Container,
} from "@mui/material";
import useSchoiceStore from "../../../store/Schoice.store";
import CollapseRow from "./CollapseRow";
export default function TrashTable() {
  const { trash } = useSchoiceStore();

  return (
    <Container maxWidth="lg" sx={{ mt: 2 }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align="center"></TableCell>
              <TableCell align="center" component="th" scope="row">
                Name
              </TableCell>
              <TableCell align="center">Type</TableCell>
              <TableCell align="center">Time</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {trash.map((item, index) => (
              <CollapseRow key={index} item={item} />
            ))}
            {trash.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary">
                    Trash is empty.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}
