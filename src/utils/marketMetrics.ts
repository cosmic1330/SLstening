export const hasSamples = (records: unknown[], count: number) => records.length >= count;
export const hasVolumeBaseline = (records: Array<{ v: number }>) => records.length >= 11 && records.slice(-11, -1).every((item) => Number.isFinite(item.v)) && records.slice(-11, -1).reduce((sum, item) => sum + item.v, 0) !== 0;
