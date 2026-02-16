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
import type { CalculationData, DashboardTransform } from '../lib/api';

interface ConsumptionChartProps {
  electricityData: CalculationData;
  waterData: CalculationData;
  gasData: CalculationData;
  cumulatedWater: boolean;
  transform: DashboardTransform;
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
  transform,
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
    // Store both scaled (for line display) and raw (for tooltip) values
    const elecByPeriod: Record<string, number> = {};
    const elecRawByPeriod: Record<string, number> = {};
    electricityData.periods.forEach((period) => {
      const hasValidConsumption = period.meters.some(m => m.consumption !== null);
      if (hasValidConsumption) {
        const total = period.meters.reduce((sum, m) => sum + (m.consumption || 0), 0);
        elecRawByPeriod[period.period] = total;
        elecByPeriod[period.period] = total * transform.electricity_scale + transform.electricity_offset;
      }
    });

    // Process gas data from CalculationData
    // Store both scaled (for line display) and raw (for tooltip) values
    const gasByPeriod: Record<string, number> = {};
    const gasRawByPeriod: Record<string, number> = {};
    gasData.periods.forEach((period) => {
      const hasValidConsumption = period.meters.some(m => m.consumption !== null);
      if (hasValidConsumption) {
        const total = period.meters.reduce((sum, m) => sum + (m.consumption || 0), 0);
        gasRawByPeriod[period.period] = total;
        gasByPeriod[period.period] = total * transform.gas_scale + transform.gas_offset;
      }
    });

    // Process water data from CalculationData
    // Store both scaled (for line display) and raw (for tooltip) values
    const waterTotalByPeriod: Record<string, number> = {};
    const waterWarmByPeriod: Record<string, number> = {};
    const waterColdByPeriod: Record<string, number> = {};
    const waterTotalRawByPeriod: Record<string, number> = {};
    const waterWarmRawByPeriod: Record<string, number> = {};
    const waterColdRawByPeriod: Record<string, number> = {};

    waterData.periods.forEach((period) => {
      const hasValidConsumption = period.meters.some(m => m.consumption !== null);
      if (hasValidConsumption) {
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

        waterTotalRawByPeriod[period.period] = periodTotal;
        waterWarmRawByPeriod[period.period] = periodWarm;
        waterColdRawByPeriod[period.period] = periodCold;
        waterTotalByPeriod[period.period] = periodTotal * transform.water_scale + transform.water_offset;
        waterWarmByPeriod[period.period] = periodWarm * transform.water_scale + transform.water_offset;
        waterColdByPeriod[period.period] = periodCold * transform.water_scale + transform.water_offset;
      }
    });

    // Collect all periods from all data types
    // Only include periods that have at least one valid consumption value
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

    // Check if any scale is not 1.0 or any offset is not 0 (to hide Y-axis)
    const hasTransform = 
      transform.electricity_scale !== 1.0 || transform.electricity_offset !== 0 ||
      transform.gas_scale !== 1.0 || transform.gas_offset !== 0 ||
      transform.water_scale !== 1.0 || transform.water_offset !== 0;

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
               display: !hasTransform, // Hide Y-axis when transform is active
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
              callbacks: {
                label: function(context: any) {
                  const datasetLabel = context.dataset.label || '';
                  const period = context.label;
                  let value: number | null = null;

                  // Get the raw (unscaled) value based on the dataset label
                  if (datasetLabel.includes('Electricity')) {
                    value = elecRawByPeriod[period] ?? null;
                  } else if (datasetLabel.includes('Gas')) {
                    value = gasRawByPeriod[period] ?? null;
                  } else if (datasetLabel.includes('Warm Water')) {
                    value = waterWarmRawByPeriod[period] ?? null;
                  } else if (datasetLabel.includes('Cold Water')) {
                    value = waterColdRawByPeriod[period] ?? null;
                  } else if (datasetLabel.includes('Water')) {
                    value = waterTotalRawByPeriod[period] ?? null;
                  }

                  if (value !== null) {
                    return `${datasetLabel}: ${value.toFixed(1)}`;
                  }
                  return datasetLabel;
                },
              },
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
  }, [electricityData, waterData, gasData, cumulatedWater, transform]);

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
