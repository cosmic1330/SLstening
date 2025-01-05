import { Button } from "@mui/material";
import { useNavigate } from "react-router";
import StockBox from "../../components/StockBox";
import useStocksStore from "../../store/Stock.store";

function List() {
  const { stocks, reload } = useStocksStore();

  let navigate = useNavigate();

  return (
    <div>
      <Button
        variant="contained"
        size="small"
        onClick={async () => {
          navigate("/dashboard/other");
        }}
      >
        Go Other
      </Button>
      <Button variant="contained" size="small" onClick={reload}>
        Reload
      </Button>
      {stocks.map((id) => (
        <StockBox key={id} id={id} />
      ))}
    </div>
  );
}
export default List;
