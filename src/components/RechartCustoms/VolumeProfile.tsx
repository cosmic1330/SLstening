interface FormattedGraphicalItem {
  props: {
    points: {
      x: number;
      y: number;
      value: number;
      payload?: any;
    }[];
  };
}

const VolumeProfile = (props: any) => {
  const { formattedGraphicalItems, width, margin } = props;

  if (!formattedGraphicalItems || formattedGraphicalItems.length === 0) {
    return null;
  }

  // Find the first series containing data points (e.g., High or Close series)
  const highSeries = formattedGraphicalItems[0] as FormattedGraphicalItem;
  const points = highSeries?.props?.points;

  if (!points || points.length === 0) {
    return null;
  }

  // Extract visible deals from payloads
  const visibleDeals = points.map((p) => p?.payload).filter(Boolean);

  if (visibleDeals.length === 0) {
    return null;
  }

  // 1. Calculate price range for visible deals
  let maxPrice = -Infinity;
  let minPrice = Infinity;
  for (const deal of visibleDeals) {
    if (deal.h > maxPrice) maxPrice = deal.h;
    if (deal.l < minPrice) minPrice = deal.l;
  }

  if (maxPrice <= minPrice) {
    return null;
  }

  // 2. Divide range into bins
  const binsCount = 30;
  const binSize = (maxPrice - minPrice) / binsCount;
  const bins = Array.from({ length: binsCount }, () => ({
    buyVolume: 0,
    sellVolume: 0,
  }));

  // 3. Distribute volume into bins
  for (const deal of visibleDeals) {
    const { o, h, l, c, v } = deal;
    const isUp = c > o;

    if (h === l || binSize === 0) {
      const idx = Math.min(
        binsCount - 1,
        Math.max(0, Math.floor((c - minPrice) / binSize)),
      );
      if (isUp) {
        bins[idx].buyVolume += v;
      } else {
        bins[idx].sellVolume += v;
      }
    } else {
      const barRange = h - l;
      for (let i = 0; i < binsCount; i++) {
        const binMin = minPrice + i * binSize;
        const binMax = minPrice + (i + 1) * binSize;

        // Overlap between candle range [l, h] and bin range [binMin, binMax]
        const overlap = Math.max(0, Math.min(h, binMax) - Math.max(l, binMin));
        if (overlap > 0) {
          const fraction = overlap / barRange;
          const distributedVol = v * fraction;

          if (isUp) {
            bins[i].buyVolume += distributedVol;
          } else {
            bins[i].sellVolume += distributedVol;
          }
        }
      }
    }
  }

  // 4. Find max volume for scale
  let maxTotalVolume = 0;
  for (const bin of bins) {
    const total = bin.buyVolume + bin.sellVolume;
    if (total > maxTotalVolume) {
      maxTotalVolume = total;
    }
  }

  if (maxTotalVolume === 0) {
    return null;
  }

  // 5. Get Y-axis scale to map prices to pixel coordinates
  const yAxisKey = Object.keys(props.yAxisMap || {})[0];
  const yAxis = props.yAxisMap?.[yAxisKey];
  const yScale = yAxis?.scale;

  if (typeof yScale !== "function") {
    return null;
  }

  const leftX = margin?.left || 65;
  const maxProfileWidth = width * 0.18; // Use 18% of chart width

  return (
    <g key="volume-profile-overlay" className="volume-profile">
      {bins.map((bin, i) => {
        const total = bin.buyVolume + bin.sellVolume;
        if (total === 0) return null;

        const binMin = minPrice + i * binSize;
        const binMax = minPrice + (i + 1) * binSize;

        const yMin = yScale(binMin);
        const yMax = yScale(binMax);

        if (isNaN(yMin) || isNaN(yMax)) return null;

        const y = Math.min(yMin, yMax);
        const rawHeight = Math.abs(yMin - yMax);
        const height = Math.max(rawHeight - 0.8, 1.2); // Add spacing between bins

        // Scale widths
        const barWidth = (total / maxTotalVolume) * maxProfileWidth;
        const sellWidth = (bin.sellVolume / total) * barWidth;
        const buyWidth = (bin.buyVolume / total) * barWidth;

        const isBuyDominant = bin.buyVolume > bin.sellVolume;
        const buyFillOpacity = 0.3;
        const sellFillOpacity = 0.3;

        return (
          <g key={`vp-bin-${i}`}>
            {/* Sell Volume (Green) */}
            {sellWidth > 0 && (
              <rect
                x={leftX}
                y={y}
                width={sellWidth}
                height={height}
                fill="#52c41a"
                fillOpacity={sellFillOpacity}
              />
            )}
            {/* Sell Volume Inner Stroke (Green) */}
            {sellWidth > 1 && !isBuyDominant && (
              <rect
                x={leftX + 0.5}
                y={y + 0.5}
                width={sellWidth - 1}
                height={height - 1}
                fill="none"
                stroke="#52c41a"
                strokeOpacity={0.5}
                strokeWidth={1}
              />
            )}
            {/* Buy Volume (Red) */}
            {buyWidth > 0 && (
              <rect
                x={leftX + sellWidth}
                y={y}
                width={buyWidth}
                height={height}
                fill="#ff4d4f"
                fillOpacity={buyFillOpacity}
              />
            )}
            {/* Buy Volume Inner Stroke (Red) */}
            {buyWidth > 1 && isBuyDominant && (
              <rect
                x={leftX + sellWidth + 0.5}
                y={y + 0.5}
                width={buyWidth - 1}
                height={height - 1}
                fill="none"
                stroke="#ff4d4f"
                strokeOpacity={0.5}
                strokeWidth={1}
              />
            )}
          </g>
        );
      })}
    </g>
  );
};

export default VolumeProfile;
