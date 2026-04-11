"use client";

import { useMemo } from "react";
import {
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface EnhancedPieChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  title?: string;
  showLegend?: boolean;
  showPercentage?: boolean;
  formatValue?: (value: number) => string;
  height?: number;
}

const DEFAULT_COLORS = [
  "#9DC65D", // verde-suave
  "#1E3A8A", // azul-profundo
  "#D4A853", // dorado
  "#8B4513", // tierra-media
  "#AE0000", // rojo OPTTIUS
  "#4A7C59", // verde oscuro
  "#60A5FA", // azul claro
  "#F59E0B", // amarillo
  "#EC4899", // rosa
  "#8B5CF6", // púrpura
];

const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: unknown) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      dominantBaseline="central"
      fill="white"
      fontSize={12}
      fontWeight="bold"
      textAnchor={x > cx ? "start" : "end"}
      x={x}
      y={y}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function EnhancedPieChart({
  data,
  title,
  showLegend = true,
  showPercentage = true,
  formatValue = (val) => val.toString(),
  height = 400,
}: EnhancedPieChartProps) {
  const chartData = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return data.map((item, index) => ({
      ...item,
      name: item.label,
      value: item.value,
      percentage: total > 0 ? (item.value / total) * 100 : 0,
      color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    }));
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-admin-text-tertiary">
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
            {data.name}
          </p>
          <p className="text-sm" style={{ color: data.color }}>
            <span className="font-medium">Valor: </span>
            {formatValue(data.value)}
          </p>
          {showPercentage && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {data.percentage.toFixed(1)}% del total
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const pieHeight = Math.min(height * 0.6, 220);
  const outerRadius = Math.min(90, pieHeight / 2 - 10);

  return (
    <div className="flex flex-col w-full min-h-0">
      {title && (
        <h4 className="font-semibold text-sm sm:text-base text-epoch-primary dark:text-admin-text-primary text-center mb-2 shrink-0">
          {title}
        </h4>
      )}

      <div className="shrink-0" style={{ height: pieHeight }}>
        <ResponsiveContainer height="100%" width="100%">
          <RechartsPieChart
            id="enhanced-pie-chart"
            margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
          >
            <Pie
              animationDuration={1000}
              animationEasing="ease-out"
              cx="50%"
              cy="50%"
              data={chartData}
              dataKey="value"
              fill="#8884d8"
              label={showPercentage ? renderCustomizedLabel : false}
              labelLine={false}
              outerRadius={outerRadius}
            >
              {chartData.map((entry, index) => (
                <Cell fill={entry.color} key={`cell-${index}`} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>

      {showLegend && (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-3 shrink-0">
          {chartData.map((entry, index) => (
            <div
              className="flex items-center gap-2 text-xs sm:text-sm"
              key={`legend-${index}`}
            >
              <div
                className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-700 dark:text-gray-300 truncate max-w-[120px] sm:max-w-none">
                {entry.label}
              </span>
              {showPercentage && (
                <span className="text-gray-500 dark:text-gray-400 font-semibold shrink-0">
                  ({entry.percentage.toFixed(1)}%)
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="text-center pt-3 mt-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
        <p className="text-xs text-admin-text-tertiary dark:text-gray-400 mb-0.5">
          Total
        </p>
        <p className="font-bold text-base sm:text-lg text-epoch-primary dark:text-admin-text-primary">
          {formatValue(chartData.reduce((sum, item) => sum + item.value, 0))}
        </p>
      </div>
    </div>
  );
}
