"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface EnhancedColumnChartProps {
  data: Array<{ date: string; value: number; count?: number }>;
  title?: string;
  color?: string;
  formatValue?: (value: number) => string;
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

export function EnhancedColumnChart({
  data,
  title,
  color = "#9DC65D",
  formatValue = (val) => val.toString(),
  height = 300,
}: EnhancedColumnChartProps) {
  // Aggregate data if too many points
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // If more than 14 data points, aggregate by weeks
    if (data.length > 14) {
      const weeklyData: Array<{ date: string; value: number; count: number }> =
        [];
      const itemsPerWeek = Math.ceil(data.length / 12); // Show max 12 bars

      for (let i = 0; i < data.length; i += itemsPerWeek) {
        const weekData = data.slice(i, i + itemsPerWeek);
        const weekTotal = weekData.reduce((sum, item) => sum + item.value, 0);
        const weekCount = weekData.reduce(
          (sum, item) => sum + (item.count || 0),
          0,
        );
        const startDate = weekData[0].date;
        const endDate = weekData[weekData.length - 1].date;

        weeklyData.push({
          date: `${formatDate(startDate)} - ${formatDate(endDate)}`,
          value: weekTotal,
          count: weekCount,
        });
      }
      return weeklyData.map((item) => ({
        ...item,
        name: item.date,
        formattedDate: item.date,
      }));
    }

    return data.map((item) => ({
      ...item,
      name: formatDate(item.date),
      formattedDate: formatDate(item.date),
    }));
  }, [data]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-admin-text-tertiary">
        <p className="text-lg font-medium">No hay datos para mostrar</p>
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
            {formatValue(data.value)}
          </p>
          {data.count !== undefined && data.count > 0 && (
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
        <RechartsBarChart
          data={chartData}
          id="enhanced-column-chart"
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid
            className="dark:opacity-20"
            opacity={0.3}
            stroke="#E5E7EB"
            strokeDasharray="3 3"
          />
          <XAxis
            angle={-45}
            axisLine={false}
            className="dark:text-gray-400"
            dataKey="name"
            fontSize={12}
            height={80}
            interval={0}
            stroke="#6B7280"
            textAnchor="end"
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            className="dark:text-gray-400"
            fontSize={12}
            stroke="#6B7280"
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
              return formatValue(value);
            }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            animationDuration={1000}
            animationEasing="ease-out"
            dataKey="value"
            radius={[8, 8, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell
                className="hover:opacity-80 transition-opacity"
                fill={color}
                key={`cell-${index}`}
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-admin-text-tertiary dark:text-gray-400 mb-1">
            Promedio
          </p>
          <p className="font-bold text-sm text-epoch-primary dark:text-admin-text-primary">
            {formatValue(
              chartData.reduce((sum, item) => sum + item.value, 0) /
                chartData.length,
            )}
          </p>
        </div>
        <div
          className="text-center p-2 rounded-lg"
          style={{ backgroundColor: `${color}15` }}
        >
          <p className="text-xs text-admin-text-tertiary dark:text-gray-400 mb-1">
            Total
          </p>
          <p className="font-bold text-sm" style={{ color }}>
            {formatValue(chartData.reduce((sum, item) => sum + item.value, 0))}
          </p>
        </div>
        <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-xs text-admin-text-tertiary dark:text-gray-400 mb-1">
            Períodos
          </p>
          <p className="font-bold text-sm text-epoch-primary dark:text-blue-400">
            {chartData.length}
          </p>
        </div>
      </div>
    </div>
  );
}
