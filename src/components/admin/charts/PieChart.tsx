"use client";

import { memo, useMemo } from "react";

interface PieChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  title?: string;
  showLegend?: boolean;
  showPercentage?: boolean;
}

const DEFAULT_COLORS = [
  "#9DC65D", // verde-suave
  "#1E3A8A", // azul-profundo
  "#D4A853", // dorado
  "#8B4513", // tierra-media
  "#AE0000", // rojo OPTTIUS
  "#4A7C59", // verde oscuro
  "#F6FBD6", // verde claro
  "#E5E7EB", // gris
];

function PieChartComponent({
  data,
  title,
  showLegend = true,
  showPercentage = true,
}: PieChartProps) {
  const total = useMemo(
    () => data.reduce((sum, item) => sum + item.value, 0),
    [data],
  );

  const chartData = useMemo(() => {
    let currentAngle = -90; // Start from top

    return data.map((item, index) => {
      const percentage = total > 0 ? (item.value / total) * 100 : 0;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;

      currentAngle = endAngle;

      return {
        ...item,
        percentage,
        startAngle,
        endAngle,
        color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      };
    });
  }, [data, total]);

  const createArc = (startAngle: number, endAngle: number, radius: number) => {
    const start = polarToCartesian(50, 50, radius, endAngle);
    const end = polarToCartesian(50, 50, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    return [
      "M",
      50,
      50,
      "L",
      start.x,
      start.y,
      "A",
      radius,
      radius,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
      "Z",
    ].join(" ");
  };

  const polarToCartesian = (
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number,
  ) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  if (data.length === 0 || total === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-tierra-media">
        No hay datos para mostrar
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title && (
        <h4 className="font-medium text-azul-profundo text-center">{title}</h4>
      )}

      <div className="flex flex-col lg:flex-row items-center gap-6">
        {/* Pie Chart SVG */}
        <div className="relative w-64 h-64">
          <svg
            className="w-full h-full transform -rotate-90"
            viewBox="0 0 100 100"
          >
            {chartData.map((item, index) => (
              <path
                className="transition-all hover:opacity-80 cursor-pointer"
                d={createArc(item.startAngle, item.endAngle, 45)}
                fill={item.color}
                key={index}
                style={{ transformOrigin: "50% 50%" }}
              />
            ))}
            {/* Center circle for donut effect */}
            <circle cx="50" cy="50" fill="white" r="25" />
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-azul-profundo">
              {total}
            </span>
            <span className="text-xs text-tierra-media">Total</span>
          </div>
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="flex-1 space-y-2">
            {chartData.map((item, index) => (
              <div
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors"
                key={index}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium truncate">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <span className="text-sm font-bold text-azul-profundo">
                    {item.value}
                  </span>
                  {showPercentage && (
                    <span className="text-xs text-tierra-media">
                      ({item.percentage.toFixed(1)}%)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Memoize PieChart to prevent unnecessary re-renders
export const PieChart = memo(PieChartComponent);
