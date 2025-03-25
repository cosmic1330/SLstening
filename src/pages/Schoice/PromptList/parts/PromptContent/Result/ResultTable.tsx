import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import ResultTableRow from "./ResultTableRow";

const columns = [
  "日期",
  "代碼",
  "名稱",
  "收盤價",
  "日趨勢圖",
  "周趨勢圖",
  "周KD趨勢圖",
  "Action",
];

export default function ResultTable({ result }: { result: any[] }) {
  return (
    <Paper sx={{ width: "100%", overflow: "hidden" }}>
      <TableContainer sx={{ maxHeight: 500 }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
            <TableCell width={5}></TableCell>
              {columns.map((column) => (
                <TableCell key={column}>{column}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {result &&
              result.map((row, index) => {
                return <ResultTableRow key={index} row={row} index={index}/>;
              })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
