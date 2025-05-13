import { Button, Divider, Stack, Tooltip, Typography } from "@mui/material";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import useSchoiceStore from "../../../store/Schoice.store";
import RepartitionIcon from "@mui/icons-material/Repartition";
import { toast } from "react-toastify";

export default function FilterStocks() {
  const { filterStocks, setFilterStocks } = useSchoiceStore();
  if (!filterStocks) return <></>;

  const handleClick = () => {
    setFilterStocks(undefined, undefined);
    toast.success("已清除基本面塞選");
  };

  return (
    <>
      <Tooltip title="Filter By Fundamental">
        <Stack direction="row" alignItems="center" spacing={2}>
          <FilterAltIcon />
          <Typography>{filterStocks.length}</Typography>
          <Button
            size="small"
            variant="contained"
            color="warning"
            startIcon={<RepartitionIcon />}
            onClick={handleClick}
          >
            Free
          </Button>
        </Stack>
      </Tooltip>
      <Divider orientation="vertical" flexItem />
    </>
  );
}
