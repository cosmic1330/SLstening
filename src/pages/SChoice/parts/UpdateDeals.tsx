import { Button } from "@mui/material";
import useHighConcurrencyDeals, {
  Status,
} from "../../../hooks/useHighConcurrencyDeals";

export default function UpdateDeals() {
  const { update, status, persent, count } = useHighConcurrencyDeals();

  return (
    <Button
      variant="outlined"
      onClick={update}
      disabled={status !== Status.Idle}
    >
      {status === Status.Download
        ? `${persent}%`
        : status === Status.SaveDB
        ? `${count} Finished`
        : "Update"}
    </Button>
  );
}
