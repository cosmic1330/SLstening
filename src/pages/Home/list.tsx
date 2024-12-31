import { Button } from "@mui/material";
import { useNavigate } from "react-router";

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
      List
    </div>
  );
}
export default List;
