import { Button } from "@mui/material";
import { useNavigate } from "react-router";

function Login() {
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
        Go Dashboard
      </Button>
      Login
    </div>
  );
}
export default Login;
