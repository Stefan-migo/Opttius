"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useMemo } from "react";

interface EnhancedBarChartProps {
  data: Array<{ label: string; value: number }>;
  title?: string;
  color?: string;
  horizontal?: boolean;
  showValues?: boolean;
  formatValue?: (value: number) => string;
  height?: number;
}

const COLORS = [
  "#9DC65D", // verde-suave
  "#1E3A8A", // azul-profundo
  "#D4A853", // dorado
  "#8B4513", // tierra-media
  "#AE0000", // rojo OPTTIUS
  "#4A7C59", // verde oscuro
  "#F6FBD6", // verde claro
  "#E5E7EB", // gris
];

export function EnhancedBarChart({
  data,
  title,
  color = "#9DC65D",
  horizontal = false,
  showValues = true,
  formatValue = (val) => val.toString(),
  height = 300,
}: EnhancedBarChartProps) {
  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      name: item.label,
      value: item.value,
      color: color || COLORS[index % COLORS.length],
    }));
  }, [data, color]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-admin-text-tertiary">
        <p className="text-lg font-medium">No hay datos para mostrar</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {data.name || data.label}
          </p>
          <p className="text-sm" style={{ color: data.color || color }}>
            <span className="font-medium">Valor: </span>
            {formatValue(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (horizontal) {
    return (
      <div className="space-y-4 w-full">
        {title && (
          <h4 className="font-semibold text-lg text-epoch-primary dark:text-admin-text-primary">
            {title}
          </h4>
        )}

        <ResponsiveContainer width="100%" height={height}>
          <RechartsBarChart
            id="enhanced-bar-chart"
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E5E7EB"
              opacity={0.3}
              className="dark:opacity-20"
            />
            <XAxis
              type="number"
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => {
                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                return formatValue(value);
              }}
              className="dark:text-gray-400"
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={120}
              className="dark:text-gray-400"
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="value"
              radius={[0, 8, 8, 0]}
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {title && (
        <h4 className="font-semibold text-lg text-epoch-primary dark:text-admin-text-primary text-center">
          {title}
        </h4>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          id="enhanced-bar-chart"
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#E5E7EB"
            opacity={0.3}
            className="dark:opacity-20"
          />
          <XAxis
            dataKey="name"
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
            className="dark:text-gray-400"
          />
          <YAxis
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
              return formatValue(value);
            }}
            className="dark:text-gray-400"
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="value"
            radius={[8, 8, 0, 0]}
            animationDuration={1000}
            animationEasing="ease-out"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
