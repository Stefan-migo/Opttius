"use client";

import { memo, useMemo } from "react";

interface LineChartProps {
  data: Array<{ date: string; value: number; count?: number }>;
  title?: string;
  color?: string;
  formatValue?: (value: number) => string;
  showGrid?: boolean;
  showPoints?: boolean;
}

function LineChartComponent({
  data,
  title,
  color = "#9DC65D",
  formatValue = (val) => val.toString(),
  showGrid = true,
  showPoints = true,
}: LineChartProps) {
  const { maxValue, minValue, points, hasData } = useMemo(() => {
    if (!data || data.length === 0) {
      return { maxValue: 0, minValue: 0, points: [], hasData: false };
    }

    const values = data.map((item) => item.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    // Add 10% padding to top and bottom
    const padding = range * 0.1;
    const paddedMax = max + padding;
    const paddedMin = Math.max(0, min - padding);
    const paddedRange = paddedMax - paddedMin || 1;

    const chartPoints = data.map((item, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((item.value - paddedMin) / paddedRange) * 100;
      return { x, y, value: item.value, date: item.date, count: item.count };
    });

    return {
      maxValue: paddedMax,
      minValue: paddedMin,
      points: chartPoints,
      hasData: max > 0 || min > 0,
    };
  }, [data]);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-tierra-media space-y-2">
        <p className="text-lg font-medium">No hay datos para mostrar</p>
        <p className="text-sm text-center max-w-md">
          No se encontraron datos para el período seleccionado. Los datos
          aparecerán cuando haya actividad registrada en el sistema.
        </p>
      </div>
    );
  }

  // Generate grid lines (5 horizontal lines)
  const gridLines = showGrid ? [0, 25, 50, 75, 100] : [];

  // Calculate Y-axis labels
  const yAxisLabels = gridLines.map((y) => {
    const value = minValue + ((100 - y) / 100) * (maxValue - minValue);
    return { y, label: formatValue(value) };
  });

  return (
    <div className="space-y-4">
      {title && (
        <h4 className="font-medium text-azul-profundo text-center">{title}</h4>
      )}

      <div className="relative">
        {/* Chart container */}
        <div className="flex">
          {/* Y-axis labels */}
          <div className="flex flex-col justify-between h-64 pr-3 text-xs text-tierra-media">
            {yAxisLabels.reverse().map((label, idx) => (
              <div className="text-right" key={idx}>
                {label.label}
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div className="flex-1 relative">
            <svg className="overflow-visible" height="256" width="100%">
              {/* Grid lines */}
              {showGrid &&
                gridLines.map((y, idx) => (
                  <line
                    key={idx}
                    stroke="#E5E7EB"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                    x1="0"
                    x2="100%"
                    y1={`${y}%`}
                    y2={`${y}%`}
                  />
                ))}

              {/* Area fill */}
              <defs>
                <linearGradient
                  id={`gradient-${title}`}
                  x1="0%"
                  x2="0%"
                  y1="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.05" />
                </linearGradient>
              </defs>

              <path
                d={`
                  M 0,${points[0].y}
                  ${points.map((p, i) => `L ${p.x},${p.y}`).join(" ")}
                  L ${points[points.length - 1].x},100
                  L 0,100
                  Z
                `}
                fill={`url(#gradient-${title})`}
              />

              {/* Line */}
              <polyline
                fill="none"
                points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                stroke={color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />

              {/* Points */}
              {showPoints &&
                points.map((point, index) => (
                  <g key={index}>
                    <circle
                      className="cursor-pointer hover:r-6 transition-all"
                      cx={`${point.x}%`}
                      cy={`${point.y}%`}
                      fill="white"
                      r="5"
                      stroke={color}
                      strokeWidth="2"
                    />
                    <title>
                      {point.date}: {formatValue(point.value)}
                      {point.count !== undefined && ` (${point.count} items)`}
                    </title>
                  </g>
                ))}
            </svg>
          </div>
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-xs text-tierra-media pl-12">
          <span>{data[0]?.date}</span>
          {data.length > 2 && (
            <span>{data[Math.floor(data.length / 2)]?.date}</span>
          )}
          <span>{data[data.length - 1]?.date}</span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
        <div className="text-center">
          <p className="text-xs text-tierra-media">Promedio</p>
          <p className="font-bold text-azul-profundo">
            {formatValue(
              data.reduce((sum, item) => sum + item.value, 0) / data.length,
            )}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-tierra-media">Máximo</p>
          <p className="font-bold text-verde-suave">
            {formatValue(Math.max(...data.map((d) => d.value)))}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-tierra-media">Mínimo</p>
          <p className="font-bold text-red-500">
            {formatValue(Math.min(...data.map((d) => d.value)))}
          </p>
        </div>
      </div>
    </div>
  );
}

// Memoize LineChart to prevent unnecessary re-renders
export const LineChart = memo(LineChartComponent);
