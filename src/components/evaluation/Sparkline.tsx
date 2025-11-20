import React, { useMemo } from 'react';
import { getAccentColor, getLossColor } from '../../lib/chartColors';

type SparklineProps = {
  data: number[];
  width?: number;
  height?: number;
};

export default function Sparkline({ data, width = 280, height = 44 }: SparklineProps) {
  const { min, max, xs, ys } = useMemo(() => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const n = data.length;
    const xs = (i: number) => width * (i / (n - 1));
    const ys = (v: number) =>
      max === min ? height / 2 : (height - 2) * (1 - (v - min) / (max - min)) + 1;
    return { min, max, xs, ys };
  }, [data, width, height]);

  const pathData = useMemo(() => {
    return data.map((v, i) => `${i === 0 ? 'M' : 'L'}${xs(i)} ${ys(v)}`).join(' ');
  }, [data, xs, ys]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', height }}
      aria-label="資金曲線（スパークライン）"
    >
      <line
        x1={0}
        y1={height - 1}
        x2={width}
        y2={height - 1}
        stroke="#e5e7eb"
        strokeWidth="1"
      />
      <path d={pathData} stroke="var(--accent)" fill="none" strokeWidth="2" />
    </svg>
  );
}
