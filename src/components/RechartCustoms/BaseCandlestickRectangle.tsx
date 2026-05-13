import { Rectangle } from "recharts";

type FormattedGraphicalItem = {
  props: {
    points: {
      x: number;
      y: number;
      value: number;
      payload?: any;
    }[];
  };
};

// using Customized gives you access to all relevant chart props
const BaseCandlestickRectangle = (props: any) => {
  const { formattedGraphicalItems } = props;

  if (!formattedGraphicalItems || formattedGraphicalItems.length < 4) {
    return null;
  }

  // get first and second series in chart
  const highSeries = formattedGraphicalItems[0] as FormattedGraphicalItem;
  const closeSeries = formattedGraphicalItems[1] as FormattedGraphicalItem;
  const lowSeries = formattedGraphicalItems[2] as FormattedGraphicalItem;
  const openSeries = formattedGraphicalItems[3] as FormattedGraphicalItem;

  if (!highSeries?.props?.points) {
    return null;
  }

  // Create lookups based on timestamp 't' for robust matching across series
  const lowPointsMap = new Map<any, any>();
  lowSeries?.props?.points?.forEach((p) => {
    if (p?.payload?.t !== undefined) {
      lowPointsMap.set(p.payload.t, p);
    }
  });

  const closePointsMap = new Map<any, any>();
  closeSeries?.props?.points?.forEach((p) => {
    if (p?.payload?.t !== undefined) {
      closePointsMap.set(p.payload.t, p);
    }
  });

  const openPointsMap = new Map<any, any>();
  openSeries?.props?.points?.forEach((p) => {
    if (p?.payload?.t !== undefined) {
      openPointsMap.set(p.payload.t, p);
    }
  });

  // Calculate dynamic candle width based on actual data point spacing
  let dynamicWidth = 4;
  const points = highSeries?.props?.points;
  if (points && points.length >= 2) {
    // Find the first non-zero distance between consecutive points
    for (let i = 0; i < Math.min(points.length - 1, 5); i++) {
      const dist = Math.abs(points[i + 1].x - points[i].x);
      if (dist > 0) {
        dynamicWidth = Math.min(Math.max(dist * 0.65, 3), 14);
        break;
      }
    }
  }

  // render custom content using points from the graph
  return highSeries.props.points.map((highSeriesPoint, index) => {
    const t = highSeriesPoint?.payload?.t;

    // Use robust lookup by timestamp, fall back to index-based if not available
    const lowSeriesPoint = t !== undefined ? lowPointsMap.get(t) : lowSeries?.props?.points?.[index];
    const closeSeriesPoint = t !== undefined ? closePointsMap.get(t) : closeSeries?.props?.points?.[index];
    const openSeriesPoint = t !== undefined ? openPointsMap.get(t) : openSeries?.props?.points?.[index];

    // Safety guard against missing coordinates
    if (!lowSeriesPoint || !closeSeriesPoint || !openSeriesPoint) {
      return null;
    }

    const { x: hX, y: hY } = highSeriesPoint;
    const { x: lX, y: lY } = lowSeriesPoint;
    const { x: cX, y: cY } = closeSeriesPoint;
    const { x: oX, y: oY } = openSeriesPoint;

    // Ensure all numeric coordinates are valid and not NaN
    if (
      typeof hX !== "number" || isNaN(hX) ||
      typeof hY !== "number" || isNaN(hY) ||
      typeof lX !== "number" || isNaN(lX) ||
      typeof lY !== "number" || isNaN(lY) ||
      typeof cX !== "number" || isNaN(cX) ||
      typeof cY !== "number" || isNaN(cY) ||
      typeof oX !== "number" || isNaN(oX) ||
      typeof oY !== "number" || isNaN(oY)
    ) {
      return null;
    }

    // Use payload for robust data comparison (fixes "All Red" issue)
    const payload = closeSeriesPoint.payload;
    const isRising = payload && typeof payload.c === 'number' && typeof payload.o === 'number'
        ? payload.c > payload.o
        : closeSeriesPoint.value > openSeriesPoint.value;
    
    // Default to Taiwan standard (Red=Up, Green=Down) if not provided
    const upColor = props.upColor || "#ff4d4f";
    const downColor = props.downColor || "#52c41a";
    
    // Use dynamic width to adapt to zoom level
    const width = props.candleWidth || dynamicWidth;
    const xOffset = width / 2;

    const diffY = Math.abs(oY - cY);
    // Guarantee a minimum height of 2px for the body to keep it visible as a block
    const candleHeight = Math.max(diffY, 1);
    // Center the minimum-height rectangle vertically relative to the open-close range
    const yShift = diffY < 1 ? (1 - diffY) / 1 : 0;
    const candleY = Math.min(oY, cY) - yShift;

    return (
      <g key={`candlestick-${index}`}>
        {/* Thin line for high-low */}
        <Rectangle
          width={1}
          height={Math.max(Math.abs(lY - hY), 1)} // 確保高度至少為 1 像素
          x={lX - 0.5} // 調整位置讓線條居中
          y={Math.min(lY, hY)}
          fill={isRising ? upColor : downColor}
        />
        {/* Thick rectangle for open-close */}
        <Rectangle
          width={width}
          height={candleHeight}
          x={lX - xOffset}
          y={candleY}
          fill={isRising ? upColor : downColor}
        />
      </g>
    );
  });
};

export default BaseCandlestickRectangle;
