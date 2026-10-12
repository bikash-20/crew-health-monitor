"use client";

import {
  LineChart,
  Line,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface SparklineProps {
  data: number[];
  threshold?: number;
  color: string;
  yMin?: number;
  yMax?: number;
  height?: number;
}

/**
 * Tiny chart with no axes, animated, threshold dashed.
 * Used inside vitals tiles.
 */
export function Sparkline({
  data,
  threshold,
  color,
  yMin,
  yMax,
  height = 56,
}: SparklineProps) {
  const points = data.map((v, i) => ({ i, v }));
  if (points.length < 2) {
    return <div style={{ height }} />;
  }
  return (
    <div style={{ height, width: "100%" }}>
      <ResponsiveContainer>
        <LineChart
          data={points}
          margin={{ top: 4, right: 2, bottom: 4, left: 2 }}
        >
          <YAxis hide domain={[yMin ?? "auto", yMax ?? "auto"]} />
          {threshold !== undefined && (
            <ReferenceLine
              y={threshold}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          )}
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.8}
            dot={false}
            isAnimationActive
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
