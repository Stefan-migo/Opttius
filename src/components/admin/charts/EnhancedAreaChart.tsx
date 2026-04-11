"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface EnhancedAreaChartProps {
  data: Array<{ date: string; value: number; count?: number }>;
  title?: string;
  color?: string;
  formatValue?: (value: number) => string;
  showGrid?: boolean;
  height?: number;
}

const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-CL", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
};

export function EnhancedAreaChart({
  data,
  title,
  color = "#9DC65D",
  formatValue = (val) => val.toString(),
  showGrid = true,
  height = 300,
}: EnhancedAreaChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      formattedDate: formatDate(item.date),
      displayValue: item.value,
    }));
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-admin-text-tertiary space-y-2">
        <p className="text-lg font-medium">No hay datos para mostrar</p>
        <p className="text-sm text-center max-w-md">
          No se encontraron datos para el período seleccionado.
        </p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: unknown) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {data.formattedDate || data.date}
          </p>
          <p className="text-sm" style={{ color }}>
            <span className="font-medium">Valor: </span>
            {formatValue(data.displayValue || data.value)}
          </p>
          {data.count !== undefined && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {data.count} {data.count === 1 ? "item" : "items"}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 w-full">
      {title && (
        <h4 className="font-semibold text-lg text-epoch-primary dark:text-admin-text-primary text-center">
          {title}
        </h4>
      )}

      <ResponsiveContainer height={height} width="100%">
        <RechartsAreaChart
          data={chartData}
          id="enhanced-area-chart"
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient
              id={`colorGradient-${color}`}
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop offset="5%" stopColor={color} stopOpacity={0.8} />
              <stop offset="95%" stopColor={color} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          {showGrid && (
            <CartesianGrid
              className="dark:opacity-20"
              opacity={0.3}
              stroke="#E5E7EB"
              strokeDasharray="3 3"
            />
          )}
          <XAxis
            axisLine={false}
            className="dark:text-gray-400"
            dataKey="formattedDate"
            fontSize={12}
            interval="preserveStartEnd"
            stroke="#6B7280"
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            className="dark:text-gray-400"
            fontSize={12}
            stroke="#6B7280"
            tickFormatter={(value) => {
              // Format large numbers
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
              return formatValue(value);
            }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            activeDot={{ r: 6, fill: color }}
            animationDuration={1000}
            animationEasing="ease-out"
            dataKey="displayValue"
            dot={{ fill: color, r: 4 }}
            fill={`url(#colorGradient-${color})`}
            stroke={color}
            strokeWidth={2}
            type="monotone"
          />
        </RechartsAreaChart>
      </ResponsiveContainer>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-admin-text-tertiary dark:text-gray-400 mb-1">
            Promedio
          </p>
          <p className="font-bold text-sm text-epoch-primary dark:text-admin-text-primary">
            {formatValue(
              data.reduce((sum, item) => sum + item.value, 0) / data.length,
            )}
          </p>
        </div>
        <div
          className="text-center p-2 rounded-lg"
          style={{ backgroundColor: `${color}15` }}
        >
          <p className="text-xs text-admin-text-tertiary dark:text-gray-400 mb-1">
            Máximo
          </p>
          <p className="font-bold text-sm" style={{ color }}>
            {formatValue(Math.max(...data.map((d) => d.value)))}
          </p>
        </div>
        <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-xs text-admin-text-tertiary dark:text-gray-400 mb-1">
            Mínimo
          </p>
          <p className="font-bold text-sm text-red-500 dark:text-red-400">
            {formatValue(Math.min(...data.map((d) => d.value)))}
          </p>
        </div>
      </div>
    </div>
  );
}
