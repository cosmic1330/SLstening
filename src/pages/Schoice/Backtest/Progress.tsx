import { LinearProgress } from "@mui/material";
import useSchoiceStore from "../../../store/Schoice.store";

export default function Progress() {
  const { backtestPersent } = useSchoiceStore();
  return <LinearProgress variant="determinate" value={backtestPersent} />;
}
