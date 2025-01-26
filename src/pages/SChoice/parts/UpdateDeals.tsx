import { Button } from "@mui/material";
import useHighConcurrencyDeals from "../../../hooks/useHighConcurrencyDeals";

export default function UpdateDeals() {
  const { update, loading, persent } = useHighConcurrencyDeals();

  return (
    <Button
      variant="outlined"
      onClick={update}
      disabled={loading}
    >
      {loading ? `${persent}%` : "Update"}
    </Button>
  );
}
