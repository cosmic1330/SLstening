import MovingAverageMetric from "./MovingAverageMetric";

export default function Ma20(props: { lastPrice: number; ma20: number; ma20_deduction_value: number; ma20_tomorrow_deduction_value: number; ma20_deduction_time: string; ma20_tomorrow_deduction_time: string }) {
  return <MovingAverageMetric period={20} lastPrice={props.lastPrice} ma={props.ma20} deductionValue={props.ma20_deduction_value} tomorrowDeductionValue={props.ma20_tomorrow_deduction_value} deductionTime={props.ma20_deduction_time} tomorrowDeductionTime={props.ma20_tomorrow_deduction_time} />;
}
