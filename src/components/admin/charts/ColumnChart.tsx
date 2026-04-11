"use client";

import { memo, useMemo } from "react";

interface ColumnChartProps {
  data: Array<{ date: string; value: number; count?: number }>;
  title?: string;
  color?: string;
  formatValue?: (value: number) => string;
}

function ColumnChartComponent({
  data,
  title,
  color = "#9DC65D",
  formatValue = (val) => val.toString(),
}: ColumnChartProps) {
  // Aggregate data to show fewer bars (weekly aggregates)
  const aggregatedData = useMemo(() => {
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
          date: `${startDate.slice(5)} - ${endDate.slice(5)}`,
          value: weekTotal,
          count: weekCount,
        });
      }
      return weeklyData;
    }

    return data;
  }, [data]);

  const maxValue = useMemo(
    () => Math.max(...aggregatedData.map((item) => item.value), 1),
    [aggregatedData],
  );

  if (aggregatedData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-tierra-media">
        <p className="text-lg font-medium">No hay datos para mostrar</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title && (
        <h4 className="font-medium text-azul-profundo text-center">{title}</h4>
      )}

      <div className="relative h-64 flex items-end justify-between gap-1 px-2">
        {aggregatedData.map((item, index) => {
          const heightPercent = (item.value / maxValue) * 100;

          return (
            <div
              className="flex-1 flex flex-col items-center space-y-1 min-w-0"
              key={index}
            >
              {/* Value label on top */}
              {item.value > 0 && (
                <div className="text-xs font-semibold text-azul-profundo mb-1">
                  {formatValue(item.value)}
                </div>
              )}

              {/* Column */}
              <div
                className="w-full rounded-t-md transition-all duration-500 ease-out hover:opacity-80 cursor-pointer relative group"
                style={{
                  height: `${heightPercent}%`,
                  backgroundColor: color,
                  minHeight: item.value > 0 ? "8px" : "0",
                }}
                title={`${item.date}: ${formatValue(item.value)}`}
              >
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {item.date}
                  <br />
                  {formatValue(item.value)}
                  {item.count && item.count > 0 && (
                    <>
                      <br />
                      {item.count} items
                    </>
                  )}
                </div>
              </div>

              {/* Date label */}
              <div
                className="text-xs text-tierra-media text-center w-full truncate"
                title={item.date}
              >
                {item.date.length > 8
                  ? `${item.date.substring(0, 8)}...`
                  : item.date}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t">
        <div className="text-center p-2 bg-gray-50 rounded">
          <p className="text-xs text-tierra-media mb-1">Promedio</p>
          <p className="font-bold text-sm text-azul-profundo">
            {formatValue(
              aggregatedData.reduce((sum, item) => sum + item.value, 0) /
                aggregatedData.length,
            )}
          </p>
        </div>
        <div className="text-center p-2 bg-verde-suave/10 rounded">
          <p className="text-xs text-tierra-media mb-1">Total</p>
          <p className="font-bold text-sm text-verde-suave">
            {formatValue(
              aggregatedData.reduce((sum, item) => sum + item.value, 0),
            )}
          </p>
        </div>
        <div className="text-center p-2 bg-blue-50 rounded">
          <p className="text-xs text-tierra-media mb-1">Períodos</p>
          <p className="font-bold text-sm text-azul-profundo">
            {aggregatedData.length}
          </p>
        </div>
      </div>
    </div>
  );
}

// Memoize ColumnChart to prevent unnecessary re-renders
export const ColumnChart = memo(ColumnChartComponent);
