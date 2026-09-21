import MovingAverageMetric from "./MovingAverageMetric";

export default function Ma5(props: { lastPrice: number; ma5: number; ma5_deduction_value: number; ma5_tomorrow_deduction_value: number; ma5_deduction_time: string; ma5_tomorrow_deduction_time: string }) {
  return <MovingAverageMetric period={5} lastPrice={props.lastPrice} ma={props.ma5} deductionValue={props.ma5_deduction_value} tomorrowDeductionValue={props.ma5_tomorrow_deduction_value} deductionTime={props.ma5_deduction_time} tomorrowDeductionTime={props.ma5_tomorrow_deduction_time} />;
}
