import { Button } from "@mui/material";
import useHighConcurrencyDeals from "../../../hooks/useHighConcurrencyDeals";

export default function UpdateDeals() {
  const { completed, errorCount, update, loading } = useHighConcurrencyDeals();

  return (
    <Button
      variant="outlined"
      onClick={update}
      disabled={loading}
    >
      {loading ? `${completed}/${errorCount}` : "Update"}
    </Button>
  );
}
