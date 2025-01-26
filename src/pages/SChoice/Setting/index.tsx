import { Box, Button, Typography } from "@mui/material";
import useSchoiceStore from "../../../store/Schoice.store";
import { useNavigate } from "react-router";

export default function Setting() {
  const { todayDate, changeTodayDate } = useSchoiceStore();
  const handleTodayDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    changeTodayDate(Number(e.target.value));
  };
  const navigate = useNavigate();

  
  return (
    <Box>
      <Typography>往回天數</Typography>
      <input type="number" value={todayDate} onChange={handleTodayDate} />
      <Button onClick={() => navigate("/schoice")}>確定</Button>
    </Box>
  );
}
