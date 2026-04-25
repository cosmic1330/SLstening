
/**
 * Hull Moving Average (HMA) Implementation
 * Formula: WMA(2*WMA(n/2) - WMA(n), sqrt(n))
 */
export class Hma {
  private calculateWMA(data: number[], period: number): number | null {
    if (data.length < period) return null;
    let sum = 0;
    let weightSum = 0;
    for (let i = 0; i < period; i++) {
      const weight = period - i;
      sum += data[data.length - 1 - i] * weight;
      weightSum += weight;
    }
    return sum / weightSum;
  }

  public calculate(data: number[], period: number): (number | null)[] {
    const wmaFull = [];
    const wmaHalf = [];
    const hma = [];

    const halfPeriod = Math.floor(period / 2);
    const sqrtPeriod = Math.floor(Math.sqrt(period));

    const diffSeries: number[] = [];

    for (let i = 0; i < data.length; i++) {
      const currentSlice = data.slice(0, i + 1);
      
      const w1 = this.calculateWMA(currentSlice, halfPeriod);
      const w2 = this.calculateWMA(currentSlice, period);

      if (w1 !== null && w2 !== null) {
        const diff = 2 * w1 - w2;
        diffSeries.push(diff);
        
        const h = this.calculateWMA(diffSeries, sqrtPeriod);
        hma.push(h);
      } else {
        hma.push(null);
      }
    }

    return hma;
  }
}

const hma = new Hma();
export default hma;
