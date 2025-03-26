import { Button } from "@mui/material";
import useHighConcurrencyDeals, {
  Status,
} from "../../../hooks/useHighConcurrencyDeals";
import { useCallback } from "react";

export default function UpdateDeals() {
  const { update, status, persent, count, stop } = useHighConcurrencyDeals();

  const handleClick = useCallback(async () => {
    if (status === Status.Idle) {
      update();
    } else if (status === Status.Download) {
      stop();
    } else if (status === Status.SaveDB) {
      sessionStorage.setItem("stop", "true");
    }
  }, [status, update, stop]);

  return (
    <Button
      variant="outlined"
      onClick={handleClick}
      color={status === Status.Idle ? "primary" : "error"}
    >
      {status === Status.Download
        ? `取得資料 ${persent}% / 取消`
        : status === Status.SaveDB
        ? `資料庫寫入 ${count} 筆 / 取消`
        : "Update"}
    </Button>
  );
}
