import { Button } from "@mui/material";
import { useNavigate } from "react-router";
import useSWR from 'swr';
import { tauriFetcher } from "../../api/http";

const API_URL = 'https://jsonplaceholder.typicode.com/posts';

function List() {
  let navigate = useNavigate();
  const { data, error, isLoading } = useSWR(API_URL, tauriFetcher);
  console.log(data, error, isLoading);
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
