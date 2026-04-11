"use client";

import { memo, useMemo } from "react";

interface AreaChartProps {
  data: Array<{ date: string; value: number; count?: number }>;
  title?: string;
  color?: string;
  formatValue?: (value: number) => string;
  showGrid?: boolean;
}

function AreaChartComponent({
  data,
  title,
  color = "#9DC65D",
  formatValue = (val) => val.toString(),
  showGrid = true,
}: AreaChartProps) {
  const { maxValue, minValue, points, hasData } = useMemo(() => {
    if (!data || data.length === 0) {
      return { maxValue: 0, minValue: 0, points: [], hasData: false };
    }

    const values = data.map((item) => item.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    // Add 10% padding to top
    const padding = range * 0.1;
    const paddedMax = max + padding;
    const paddedMin = Math.max(0, min);
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
          No se encontraron datos para el período seleccionado.
        </p>
      </div>
    );
  }

  // Generate Y-axis labels - ensure unique values for integers
  const generateYAxisLabels = () => {
    const range = maxValue - minValue;

    // For integer values (like customer counts), generate unique integer ticks
    if (formatValue(1) === "1") {
      // Check if it's integer formatting
      const step = Math.ceil(range / 4); // Try to get ~5 labels
      const uniqueValues: number[] = [];

      for (let i = 0; i <= 4; i++) {
        const value = Math.round(minValue + (i * range) / 4);
        if (!uniqueValues.includes(value)) {
          uniqueValues.push(value);
        }
      }

      // Ensure we always have max value
      if (!uniqueValues.includes(Math.round(maxValue))) {
        uniqueValues[uniqueValues.length - 1] = Math.round(maxValue);
      }

      return uniqueValues.map((value, idx) => ({
        y: ((maxValue - value) / range) * 100,
        label: formatValue(value),
      }));
    }

    // For continuous values (like money), use percentage-based grid
    const gridLines = [0, 25, 50, 75, 100];
    return gridLines.map((y) => {
      const value = minValue + ((100 - y) / 100) * (maxValue - minValue);
      return { y, label: formatValue(value) };
    });
  };

  const yAxisLabels = generateYAxisLabels();
  const gridLines = showGrid ? yAxisLabels.map((l) => l.y) : [];

  // Create smooth area path
  const areaPath = `
    M 0,${points[0].y}
    ${points
      .map((p, i) => {
        if (i === 0) return "";
        const prevP = points[i - 1];
        const cpX1 = prevP.x + (p.x - prevP.x) / 3;
        const cpX2 = prevP.x + (2 * (p.x - prevP.x)) / 3;
        return `C ${cpX1},${prevP.y} ${cpX2},${p.y} ${p.x},${p.y}`;
      })
      .join(" ")}
    L ${points[points.length - 1].x},100
    L 0,100
    Z
  `;

  const linePath = `
    M 0,${points[0].y}
    ${points
      .map((p, i) => {
        if (i === 0) return "";
        const prevP = points[i - 1];
        const cpX1 = prevP.x + (p.x - prevP.x) / 3;
        const cpX2 = prevP.x + (2 * (p.x - prevP.x)) / 3;
        return `C ${cpX1},${prevP.y} ${cpX2},${p.y} ${p.x},${p.y}`;
      })
      .join(" ")}
  `;

  return (
    <div className="space-y-4">
      {title && (
        <h4 className="font-medium text-azul-profundo text-center">{title}</h4>
      )}

      <div className="relative">
        {/* Chart container */}
        <div className="flex gap-2">
          {/* Y-axis labels */}
          <div className="flex flex-col justify-between h-64 text-xs text-tierra-media">
            {yAxisLabels.map((label, idx) => (
              <div className="text-right w-16" key={idx}>
                {label.label}
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div className="flex-1 relative">
            <svg
              className="overflow-visible"
              height="256"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
              width="100%"
            >
              {/* Grid lines */}
              {showGrid &&
                yAxisLabels.map((label, idx) => (
                  <line
                    key={idx}
                    stroke="#E5E7EB"
                    strokeDasharray="2 2"
                    strokeWidth="0.5"
                    vectorEffect="non-scaling-stroke"
                    x1="0"
                    x2="100"
                    y1={label.y}
                    y2={label.y}
                  />
                ))}

              {/* Gradient definitions */}
              <defs>
                <linearGradient
                  id={`area-gradient-${title}`}
                  x1="0%"
                  x2="0%"
                  y1="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={color} stopOpacity="0.6" />
                  <stop offset="50%" stopColor={color} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* Area fill */}
              <path
                className="transition-all duration-300"
                d={areaPath}
                fill={`url(#area-gradient-${title})`}
              />

              {/* Line */}
              <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* Hover points overlay */}
            <svg
              className="absolute top-0 left-0 pointer-events-none"
              height="256"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
              width="100%"
            >
              {points.map((point, index) => (
                <g key={index}>
                  <circle
                    className="opacity-0 hover:opacity-100 transition-opacity pointer-events-auto cursor-pointer"
                    cx={point.x}
                    cy={point.y}
                    fill={color}
                    r="1.5"
                    stroke="white"
                    strokeWidth="0.5"
                    vectorEffect="non-scaling-stroke"
                  >
                    <title>
                      {point.date}: {formatValue(point.value)}
                      {point.count !== undefined && ` (${point.count} items)`}
                    </title>
                  </circle>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-xs text-tierra-media ml-16">
          <span>{data[0]?.date}</span>
          {data.length > 2 && (
            <span className="text-center">
              {data[Math.floor(data.length / 2)]?.date}
            </span>
          )}
          <span>{data[data.length - 1]?.date}</span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t">
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="text-xs text-tierra-media mb-1">Promedio</p>
          <p className="font-bold text-sm text-azul-profundo">
            {formatValue(
              data.reduce((sum, item) => sum + item.value, 0) / data.length,
            )}
          </p>
        </div>
        <div className="text-center p-2 bg-verde-suave/10 rounded">
          <p className="text-xs text-tierra-media mb-1">Máximo</p>
          <p className="font-bold text-sm text-verde-suave">
            {formatValue(Math.max(...data.map((d) => d.value)))}
          </p>
        </div>
        <div className="text-center p-2 bg-red-50 rounded">
          <p className="text-xs text-tierra-media mb-1">Mínimo</p>
          <p className="font-bold text-sm text-red-500">
            {formatValue(Math.min(...data.map((d) => d.value)))}
          </p>
        </div>
      </div>
    </div>
  );
}

// Memoize AreaChart to prevent unnecessary re-renders
export const AreaChart = memo(AreaChartComponent);
