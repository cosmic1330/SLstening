import { Typography } from "@mui/material";
import { Status } from "../../../hooks/useHighConcurrencyDeals";
import useSchoiceStore from "../../../store/Schoice.store";

export default function Process({
  persent,
  status,
}: {
  persent: number;
  status: Status;
}) {
  const { dataCount } = useSchoiceStore();
  if (status === Status.SaveDB)
    return (
      <Typography variant="body2" color="text.secondary">
        {`資料庫寫入 ${dataCount} 筆`}
      </Typography>
    );
  else if (status === Status.Download)
    return (
      <Typography variant="body2" color="text.secondary">
        {`下載中 ${persent}%`}
      </Typography>
    );
  else
    return (
      <Typography variant="body2" color="text.secondary">
        {`錯誤`}
      </Typography>
    );
}
