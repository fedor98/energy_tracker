/**
 * ConsumptionChart Component
 * 
 * Renders a line chart displaying energy consumption data over time.
 * Shows three main data series: Electricity, Water, and Gas consumption.
 * Water can be displayed either cumulated (single line) or split into warm/cold (two lines).
 * 
 * Uses Chart.js for rendering with responsive design.
 * Chart height: 300px on mobile, 400px on desktop.
 */

import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import type { ElectricityReading, WaterReading, GasReading } from '../lib/api';

interface ConsumptionChartProps {
  electricityData: ElectricityReading[];
  waterData: WaterReading[];
  gasData: GasReading[];
  cumulatedWater: boolean;
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

    // Check if we have any data to display
    const allData = [...electricityData, ...waterData, ...gasData];
    if (allData.length === 0) {
      return;
    }

    // Prepare datasets for the chart
    const datasets: any[] = [];
    const allPeriods = new Set<string>();

    // Process electricity data - aggregate consumption per period
    const elecByPeriod: Record<string, number> = {};
    electricityData.forEach((row) => {
      if (row.period && row.consumption !== undefined) {
        elecByPeriod[row.period] = (elecByPeriod[row.period] || 0) + row.consumption;
        allPeriods.add(row.period);
      }
    });

    // Process gas data - aggregate consumption per period
    const gasByPeriod: Record<string, number> = {};
    gasData.forEach((row) => {
      if (row.period && row.consumption !== undefined) {
        gasByPeriod[row.period] = (gasByPeriod[row.period] || 0) + row.consumption;
        allPeriods.add(row.period);
      }
    });

    // Process water data - either cumulated or split by warm/cold
    const waterTotalByPeriod: Record<string, number> = {};
    const waterWarmByPeriod: Record<string, number> = {};
    const waterColdByPeriod: Record<string, number> = {};

    waterData.forEach((row) => {
      if (row.period && row.consumption !== undefined) {
        waterTotalByPeriod[row.period] = (waterTotalByPeriod[row.period] || 0) + row.consumption;
        allPeriods.add(row.period);

        if (row.is_warm_water) {
          waterWarmByPeriod[row.period] = (waterWarmByPeriod[row.period] || 0) + row.consumption;
        } else {
          waterColdByPeriod[row.period] = (waterColdByPeriod[row.period] || 0) + row.consumption;
        }
      }
    });

    // Sort periods chronologically
    const sortedPeriods = Array.from(allPeriods).sort();

    // Add Electricity dataset (yellow line)
    datasets.push({
      label: 'Electricity (kWh)',
      data: sortedPeriods.map((p) => elecByPeriod[p] || 0),
      borderColor: '#f1c40f',
      backgroundColor: 'rgba(241, 196, 15, 0.2)',
      tension: 0.1,
      fill: true,
    });

    // Add Gas dataset (green line)
    datasets.push({
      label: 'Gas (m³)',
      data: sortedPeriods.map((p) => gasByPeriod[p] || 0),
      borderColor: '#27ae60',
      backgroundColor: 'rgba(39, 174, 96, 0.2)',
      tension: 0.1,
      fill: true,
    });

    // Add Water dataset(s)
    if (cumulatedWater) {
      // Single line for total water consumption
      datasets.push({
        label: 'Water (m³)',
        data: sortedPeriods.map((p) => waterTotalByPeriod[p] || 0),
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.2)',
        tension: 0.1,
        fill: true,
      });
    } else {
      // Split into warm and cold water
      datasets.push({
        label: 'Warm Water (m³)',
        data: sortedPeriods.map((p) => waterWarmByPeriod[p] || 0),
        borderColor: '#e74c3c',
        backgroundColor: 'rgba(231, 76, 60, 0.2)',
        tension: 0.1,
        fill: true,
      });

      datasets.push({
        label: 'Cold Water (m³)',
        data: sortedPeriods.map((p) => waterColdByPeriod[p] || 0),
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.2)',
        tension: 0.1,
        fill: true,
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
  const hasData = electricityData.length > 0 || waterData.length > 0 || gasData.length > 0;

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
