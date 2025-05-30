import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import {
  Box,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import useSchoiceStore from "../../../../store/Schoice.store";

export default function RollBack() {
  const { todayDate, changeTodayDate } = useSchoiceStore();

  const handleBackward = () => {
    if (todayDate <= 0) return; // Prevent going back before day 0
    changeTodayDate(todayDate - 1);
  };
  const handleForward = () => {
    changeTodayDate(todayDate + 1);
  };

  return (
    <>
      <Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2">Rollback:</Typography>
          <IconButton onClick={handleBackward} size="small">
            <ArrowBackIcon />
          </IconButton>
          <TextField
            size="small"
            variant="standard"
            value={todayDate}
            onChange={(event) => {
              const value = event.target.value;
              const newValue = Number(value);
              if (!isNaN(newValue)) {
                changeTodayDate(newValue);
              }
            }}
            sx={{ width: 60 }}
          />
          <IconButton onClick={handleForward} size="small">
            <ArrowForwardIcon />
          </IconButton>
        </Stack>
      </Box>
      <Divider orientation="vertical" flexItem />
    </>
  );
}
