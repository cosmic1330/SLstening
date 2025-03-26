import CleaningServicesIcon from "@mui/icons-material/CleaningServices";
import { Button, Stack, Typography } from "@mui/material";
import { useContext } from "react";
import { toast } from "react-toastify";
import DatabaseController from "../../../classes/DatabaseController";
import { DatabaseContext } from "../../../context/DatabaseContext";
import useSchoiceStore from "../../../store/Schoice.store";
export default function ClearTable() {
  const { db } = useContext(DatabaseContext);
  const { changeDataCount } = useSchoiceStore();

  const handleClearDB = async () => {
    if (!db) return;
    // 清空資料表
    const databaseController = new DatabaseController(db);
    await databaseController.clearTable();
    changeDataCount(0);
    toast.success("資料庫已清空");
  };

  return (
    <Stack spacing={2} direction="row" alignItems="center">
      <CleaningServicesIcon />
      <Typography variant="subtitle1" component="span">
        清除資料庫
      </Typography>
      <Button
        onClick={handleClearDB}
        variant="contained"
        color="error"
        size="small"
      >
        清除
      </Button>
    </Stack>
  );
}
