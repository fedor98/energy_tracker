/**
 * ConsumptionChart Component
 * 
 * Renders a line chart displaying energy consumption data over time.
 * Shows three main data series: Electricity, Water, and Gas consumption.
 * Water can be displayed either cumulated (single line) or split into warm/cold (two lines).
 * 
 * Uses Chart.js for rendering with responsive design.
 * Chart height: 300px on mobile, 400px on desktop.
 * 
 * Now uses CalculationData (from calculation APIs) instead of raw readings,
 * which ensures correct consumption values even with meter resets.
 * Missing periods between data points are shown with dashed lines.
 */

import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import type { CalculationData } from '../lib/api';

interface ConsumptionChartProps {
  electricityData: CalculationData;
  waterData: CalculationData;
  gasData: CalculationData;
  cumulatedWater: boolean;
}

/**
 * Calculate the number of months between two period strings (YYYY-MM format)
 */
function monthDiff(period1: string, period2: string): number {
  const [year1, month1] = period1.split('-').map(Number);
  const [year2, month2] = period2.split('-').map(Number);
  return Math.abs((year2 - year1) * 12 + (month2 - month1));
}

export function ConsumptionChart({
  electricityData,
  waterData,
  gasData,
  cumulatedWater,
}: ConsumptionChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Clean up previous chart instance
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }

    // Process electricity data from CalculationData
    const elecByPeriod: Record<string, number> = {};
    electricityData.periods.forEach((period) => {
      const total = period.meters.reduce((sum, m) => sum + (m.consumption || 0), 0);
      elecByPeriod[period.period] = total;
    });

    // Process gas data from CalculationData
    const gasByPeriod: Record<string, number> = {};
    gasData.periods.forEach((period) => {
      const total = period.meters.reduce((sum, m) => sum + (m.consumption || 0), 0);
      gasByPeriod[period.period] = total;
    });

    // Process water data from CalculationData
    const waterTotalByPeriod: Record<string, number> = {};
    const waterWarmByPeriod: Record<string, number> = {};
    const waterColdByPeriod: Record<string, number> = {};

    waterData.periods.forEach((period) => {
      let periodTotal = 0;
      let periodWarm = 0;
      let periodCold = 0;

      period.meters.forEach((meter) => {
        const consumption = meter.consumption || 0;
        periodTotal += consumption;

        // Check if meter is warm or cold based on entity_id
        if (meter.entity_id.includes('(Warm)')) {
          periodWarm += consumption;
        } else if (meter.entity_id.includes('(Cold)')) {
          periodCold += consumption;
        }
      });

      waterTotalByPeriod[period.period] = periodTotal;
      waterWarmByPeriod[period.period] = periodWarm;
      waterColdByPeriod[period.period] = periodCold;
    });

    // Collect all periods from all data types
    const allPeriods = new Set<string>();
    Object.keys(elecByPeriod).forEach((p) => allPeriods.add(p));
    Object.keys(gasByPeriod).forEach((p) => allPeriods.add(p));
    Object.keys(waterTotalByPeriod).forEach((p) => allPeriods.add(p));

    // Check if we have any data to display
    if (allPeriods.size === 0) {
      return;
    }

    // Sort periods chronologically
    const sortedPeriods = Array.from(allPeriods).sort();

    // Helper function to create segment styling for dashed lines between gaps
    const createSegmentConfig = (periods: string[]) => ({
      borderDash: (ctx: any) => {
        if (ctx.p0DataIndex === undefined || ctx.p1DataIndex === undefined) {
          return undefined;
        }
        const prevPeriod = periods[ctx.p0DataIndex];
        const currentPeriod = periods[ctx.p1DataIndex];
        if (prevPeriod && currentPeriod) {
          const diff = monthDiff(prevPeriod, currentPeriod);
          return diff > 1 ? [5, 5] : undefined;
        }
        return undefined;
      },
    });

    // Prepare datasets for the chart
    const datasets: any[] = [];

    // Add Electricity dataset (yellow line)
    datasets.push({
      label: 'Electricity (kWh)',
      data: sortedPeriods.map((p) => elecByPeriod[p] ?? null),
      borderColor: '#f1c40f',
      backgroundColor: 'rgba(241, 196, 15, 0.08)',
      tension: 0.1,
      fill: true,
      segment: createSegmentConfig(sortedPeriods),
    });

    // Add Gas dataset (green line)
    datasets.push({
      label: 'Gas (m³)',
      data: sortedPeriods.map((p) => gasByPeriod[p] ?? null),
      borderColor: '#27ae60',
      backgroundColor: 'rgba(39, 174, 96, 0.08)',
      tension: 0.1,
      fill: true,
      segment: createSegmentConfig(sortedPeriods),
    });

    // Add Water dataset(s)
    if (cumulatedWater) {
      // Single line for total water consumption
      datasets.push({
        label: 'Water (m³)',
        data: sortedPeriods.map((p) => waterTotalByPeriod[p] ?? null),
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.08)',
        tension: 0.1,
        fill: true,
        segment: createSegmentConfig(sortedPeriods),
      });
    } else {
      // Split into warm and cold water
      datasets.push({
        label: 'Warm Water (m³)',
        data: sortedPeriods.map((p) => waterWarmByPeriod[p] ?? null),
        borderColor: '#e74c3c',
        backgroundColor: 'rgba(231, 76, 60, 0.08)',
        tension: 0.1,
        fill: true,
        segment: createSegmentConfig(sortedPeriods),
      });

      datasets.push({
        label: 'Cold Water (m³)',
        data: sortedPeriods.map((p) => waterColdByPeriod[p] ?? null),
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.08)',
        tension: 0.1,
        fill: true,
        segment: createSegmentConfig(sortedPeriods),
      });
    }

    // Create new chart instance
    const ctx = chartRef.current.getContext('2d');
    if (ctx) {
      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: sortedPeriods,
          datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.05)',
              },
            },
            x: {
              grid: {
                display: false,
              },
            },
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                usePointStyle: true,
                padding: 20,
              },
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              titleColor: '#1f2937',
              bodyColor: '#4b5563',
              borderColor: '#e5e7eb',
              borderWidth: 1,
              padding: 12,
              cornerRadius: 8,
            },
          },
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false,
          },
          spanGaps: true, // Allow gaps in the line for missing periods
        },
      });
    }

    // Cleanup on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [electricityData, waterData, gasData, cumulatedWater]);

  // Show empty state if no data
  const hasData = 
    electricityData.periods.length > 0 || 
    waterData.periods.length > 0 || 
    gasData.periods.length > 0;

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[300px] sm:h-[400px] text-gray-500">
        <p>No consumption data available for the selected period.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[300px] sm:h-[400px]">
      <canvas ref={chartRef} />
    </div>
  );
}
