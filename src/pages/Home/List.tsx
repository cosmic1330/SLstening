import { Button } from "@mui/material";
import { useNavigate } from "react-router";
import StockBox from "../../components/StockBox";

function List() {
  let navigate = useNavigate();
  return (
    <div>
      <Button
        variant="contained"
        size="small"
        onClick={() => {
          navigate("/dashboard/other");
        }}
      >
        Go Other
      </Button>
      <StockBox id="8234" />
      <StockBox id="8028" />
    </div>
  );
}
export default List;
