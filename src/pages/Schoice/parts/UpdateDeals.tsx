import { Button, Stack } from "@mui/material";
import { useCallback } from "react";
import useHighConcurrencyDeals, {
  Status,
} from "../../../hooks/useHighConcurrencyDeals";
import Process from "./Process";
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';

export default function UpdateDeals() {
  const { run, status, persent, stop } = useHighConcurrencyDeals();

  const handleClick = useCallback(async () => {
    if (status === Status.Idle) {
      sessionStorage.removeItem("schoice:update:stop");
      run();
    } else {
      stop();
    }
  }, [status, run, stop]);

  return (
    <Stack alignItems="end">
      {status !== Status.Idle && <Process persent={persent} />}
      <Button
        size="small"
        variant="contained"
        onClick={handleClick}
        color={status === Status.Idle ? "primary" : "error"}
        startIcon={<SystemUpdateAltIcon />}
      >
        {status === Status.Download ? ` 取消` : "Update"}
      </Button>
    </Stack>
  );
}
