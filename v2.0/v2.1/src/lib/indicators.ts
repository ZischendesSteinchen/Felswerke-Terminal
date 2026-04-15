/**
 * Technical indicators inspired by OpenBB's technical analysis extension.
 * Pure TypeScript implementations — no external dependencies.
 */

export interface OHLCVPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorPoint {
  time: number;
  value: number;
}

export interface BollingerBandsPoint {
  time: number;
  upper: number;
  middle: number;
  lower: number;
}

export interface MACDPoint {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

// ─── Simple Moving Average ─────────────────────────────────────────────────────
export function sma(data: IndicatorPoint[], period: number): IndicatorPoint[] {
  if (data.length < period) return [];
  const result: IndicatorPoint[] = [];
  let sum = 0;

  for (let i = 0; i < data.length; i++) {
    sum += data[i].value;
    if (i >= period) {
      sum -= data[i - period].value;
    }
    if (i >= period - 1) {
      result.push({ time: data[i].time, value: sum / period });
    }
  }

  return result;
}

// ─── Exponential Moving Average ─────────────────────────────────────────────────
export function ema(data: IndicatorPoint[], period: number): IndicatorPoint[] {
  if (data.length < period) return [];
  const k = 2 / (period + 1);
  const result: IndicatorPoint[] = [];

  // Seed with SMA of first `period` values
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].value;
  }
  let prev = sum / period;
  result.push({ time: data[period - 1].time, value: prev });

  for (let i = period; i < data.length; i++) {
    prev = data[i].value * k + prev * (1 - k);
    result.push({ time: data[i].time, value: prev });
  }

  return result;
}

// ─── Relative Strength Index ────────────────────────────────────────────────────
export function rsi(data: IndicatorPoint[], period = 14): IndicatorPoint[] {
  if (data.length < period + 1) return [];
  const result: IndicatorPoint[] = [];
  let gainSum = 0;
  let lossSum = 0;

  for (let i = 1; i <= period; i++) {
    const change = data[i].value - data[i - 1].value;
    if (change > 0) gainSum += change;
    else lossSum += Math.abs(change);
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push({
    time: data[period].time,
    value: avgLoss === 0 ? 100 : 100 - 100 / (1 + rs),
  });

  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].value - data[i - 1].value;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const currentRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({
      time: data[i].time,
      value: avgLoss === 0 ? 100 : 100 - 100 / (1 + currentRs),
    });
  }

  return result;
}

// ─── MACD (Moving Average Convergence Divergence) ───────────────────────────────
export function macd(
  data: IndicatorPoint[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDPoint[] {
  const fastEma = ema(data, fastPeriod);
  const slowEma = ema(data, slowPeriod);

  if (fastEma.length === 0 || slowEma.length === 0) return [];

  // Align by time
  const slowTimeSet = new Map(slowEma.map((p) => [p.time, p.value]));
  const macdLine: IndicatorPoint[] = [];

  for (const fp of fastEma) {
    const sv = slowTimeSet.get(fp.time);
    if (sv !== undefined) {
      macdLine.push({ time: fp.time, value: fp.value - sv });
    }
  }

  const signalLine = ema(macdLine, signalPeriod);
  const signalTimeMap = new Map(signalLine.map((p) => [p.time, p.value]));

  const result: MACDPoint[] = [];
  for (const m of macdLine) {
    const sig = signalTimeMap.get(m.time);
    if (sig !== undefined) {
      result.push({
        time: m.time,
        macd: m.value,
        signal: sig,
        histogram: m.value - sig,
      });
    }
  }

  return result;
}

// ─── Bollinger Bands ────────────────────────────────────────────────────────────
export function bollingerBands(
  data: IndicatorPoint[],
  period = 20,
  stdDev = 2
): BollingerBandsPoint[] {
  if (data.length < period) return [];
  const result: BollingerBandsPoint[] = [];

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].value;
    }
    const mean = sum / period;

    let sqSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sqSum += (data[j].value - mean) ** 2;
    }
    const std = Math.sqrt(sqSum / period);

    result.push({
      time: data[i].time,
      upper: mean + stdDev * std,
      middle: mean,
      lower: mean - stdDev * std,
    });
  }

  return result;
}

// ─── Volume-Weighted Average Price ──────────────────────────────────────────────
export function vwap(data: OHLCVPoint[]): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;

  for (const candle of data) {
    const tp = (candle.high + candle.low + candle.close) / 3;
    cumulativeTPV += tp * candle.volume;
    cumulativeVolume += candle.volume;

    result.push({
      time: candle.time,
      value: cumulativeVolume === 0 ? tp : cumulativeTPV / cumulativeVolume,
    });
  }

  return result;
}

// ─── Helper: extract close prices from OHLCV ───────────────────────────────────
export function closePrices(ohlcv: OHLCVPoint[]): IndicatorPoint[] {
  return ohlcv.map((c) => ({ time: c.time, value: c.close }));
}
