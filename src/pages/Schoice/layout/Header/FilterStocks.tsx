import FilterAltIcon from "@mui/icons-material/FilterAlt";
import RepartitionIcon from "@mui/icons-material/Repartition";
import {
  Box,
  Button,
  Divider,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import useSchoiceStore from "../../../../store/Schoice.store";

export default function FilterStocks() {
  const { filterStocks, removeFilterStocks } = useSchoiceStore();
  if (!filterStocks) return <></>;

  const handleClick = () => {
    removeFilterStocks();
    toast.success("已清除基本面塞選");
  };

  return (
    <>
      <Tooltip title="Filter By Fundamental">
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <FilterAltIcon />
            <Typography>{filterStocks.length}</Typography>
          </Stack>
          <Button
            size="small"
            variant="contained"
            color="warning"
            startIcon={<RepartitionIcon />}
            onClick={handleClick}
          >
            Free
          </Button>
        </Box>
      </Tooltip>
      <Divider orientation="vertical" flexItem />
    </>
  );
}
