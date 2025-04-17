import { Rectangle } from "recharts";

type FormattedGraphicalItem = {
  props: {
    points: {
      x: number;
      y: number;
      value: number;
    }[];
  };
};

// using Customized gives you access to all relevant chart props
const CandlestickRectangle = (props: any) => {
  const { formattedGraphicalItems } = props;
  // get first and second series in chart
  const highSeries = formattedGraphicalItems[0] as FormattedGraphicalItem;
  const closeSeries = formattedGraphicalItems[1] as FormattedGraphicalItem;
  const lowSeries = formattedGraphicalItems[2] as FormattedGraphicalItem;
  const MaSeries = formattedGraphicalItems[3] as FormattedGraphicalItem;

  // render custom content using points from the graph
  return highSeries?.props?.points.map((highSeriesPoint, index) => {
    const lowSeriesPoint = lowSeries?.props?.points[index];
    const yDifference = highSeriesPoint.y - lowSeriesPoint.y;

    return (
      <Rectangle
        key={`rectangle-${index}`}
        width={3}
        height={yDifference || 1}
        x={lowSeriesPoint.x}
        y={lowSeriesPoint.y}
        fill={
          lowSeries?.props?.points[index].value >=
            lowSeries?.props?.points[index - 1]?.value &&
          closeSeries?.props?.points[index].value >
            MaSeries?.props?.points[index - 1]?.value
            ? "red"
            : "green"
        }
      />
    );
  });
};
export default CandlestickRectangle;
