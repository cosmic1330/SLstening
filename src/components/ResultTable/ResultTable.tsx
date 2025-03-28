import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import ResultTableRow from "./ResultTableRow";
import { ActionButtonType } from "./types";
import SelectChartHead from "./SelectChartHead";

const columns = [
  "日期",
  "代碼",
  "名稱",
  "收盤價",
  "日趨勢圖",
  "週趨勢圖",
  "日布林軌道",
  <SelectChartHead/>,
  "Action",
];

export default function ResultTable({
  result,
  type = ActionButtonType.Increase,
}: {
  result: any[];
  type?: ActionButtonType;
}) {
  return (
    <Paper sx={{ width: "100%", overflow: "hidden" }}>
      <TableContainer sx={{ maxHeight: 500 }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              <TableCell width={5}></TableCell>
              {columns.map((column, index) => (
                <TableCell key={index}>{column}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {result &&
              result.map((row, index) => {
                return (
                  <ResultTableRow
                    key={index}
                    row={row}
                    index={index}
                    type={type}
                  />
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
