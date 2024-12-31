import { Button } from "@mui/material";
import { useNavigate } from "react-router";

function Other() {
  let navigate = useNavigate();
  return (
    <div>
      <Button
        variant="contained"
        size="small"
        onClick={() => {
          navigate("/dashboard");
        }}
      >
        Go List
      </Button>
      Other
    </div>
  );
}
export default Other;
