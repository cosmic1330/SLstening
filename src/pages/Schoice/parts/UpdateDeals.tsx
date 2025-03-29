import { Button, Stack } from "@mui/material";
import { useCallback } from "react";
import useHighConcurrencyDeals, {
  Status,
} from "../../../hooks/useHighConcurrencyDeals";
import Process from "./Process";

export default function UpdateDeals() {
  const { update, status, persent, stop } = useHighConcurrencyDeals();

  const handleClick = useCallback(async () => {
    if (status === Status.Idle) {
      sessionStorage.removeItem("schoice:update:stop");
      update();
    } else if (status === Status.Download) {
      stop();
    } else if (status === Status.SaveDB) {
      sessionStorage.setItem("schoice:update:stop", "true");
    }
  }, [status, update, stop]);

  return (
    <Stack alignItems="end">
      {status !== Status.Idle && <Process persent={persent} status={status} />}
      <Button
        fullWidth
        variant="outlined"
        onClick={handleClick}
        color={status === Status.Idle ? "primary" : "error"}
      >
        {status === Status.Download || status === Status.SaveDB
          ? ` 取消`
          : "Update"}
      </Button>
    </Stack>
  );
}
