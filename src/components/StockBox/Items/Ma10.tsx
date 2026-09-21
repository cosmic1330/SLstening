import MovingAverageMetric from "./MovingAverageMetric";

export default function Ma10(props: { lastPrice: number; ma10: number; ma10_deduction_value: number; ma10_tomorrow_deduction_value: number; ma10_deduction_time: string; ma10_tomorrow_deduction_time: string }) {
  return <MovingAverageMetric period={10} lastPrice={props.lastPrice} ma={props.ma10} deductionValue={props.ma10_deduction_value} tomorrowDeductionValue={props.ma10_tomorrow_deduction_value} deductionTime={props.ma10_deduction_time} tomorrowDeductionTime={props.ma10_tomorrow_deduction_time} />;
}
