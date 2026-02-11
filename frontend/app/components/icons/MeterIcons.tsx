/**
 * MeterIcons Component
 *
 * Centralized icon components for meter types and water temperature indicators.
 * Uses Lucide React icons for consistent, themeable iconography.
 */

import React from 'react';
import { Zap, Droplets, Flame, TrendingUp, Calculator } from 'lucide-react';

// Base icon props
interface IconProps {
  className?: string;
  size?: number;
}

// Electricity Icon - Yellow lightning bolt (outlined)
export function ElectricityIcon({ className = '', size = 20 }: IconProps) {
  return (
    <Zap
      className={`text-yellow-500 ${className}`}
      size={size}
      strokeWidth={2}
    />
  );
}

// Water Icon - Blue droplets (outlined)
export function WaterIcon({ className = '', size = 20 }: IconProps) {
  return (
    <Droplets
      className={`text-blue-500 ${className}`}
      size={size}
      strokeWidth={2}
    />
  );
}

// Gas Icon - Orange flame (consistent across all usages, outlined)
export function GasIcon({ className = '', size = 20 }: IconProps) {
  return (
    <Flame
      className={`text-orange-500 ${className}`}
      size={size}
      strokeWidth={2}
    />
  );
}

// Consumption/Chart Icon
export function ConsumptionIcon({ className = '', size = 20 }: IconProps) {
  return (
    <TrendingUp
      className={`text-indigo-500 ${className}`}
      size={size}
      strokeWidth={2}
    />
  );
}

// Calculator Icon
export function CalcIcon({ className = '', size = 20 }: IconProps) {
  return (
    <Calculator
      className={`text-purple-500 ${className}`}
      size={size}
      strokeWidth={2}
    />
  );
}

// Warm Water Indicator - Red circle
export function WarmWaterIndicator({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full bg-red-500 ${className}`}
      title="Warm Water"
    />
  );
}

// Cold Water Indicator - Blue circle
export function ColdWaterIndicator({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full bg-blue-500 ${className}`}
      title="Cold Water"
    />
  );
}

// Warm Water Label with indicator
export function WarmWaterLabel({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-red-500 ${className}`}>
      <WarmWaterIndicator />
      <span className="text-xs font-medium">Warm</span>
    </span>
  );
}

// Cold Water Label with indicator
export function ColdWaterLabel({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-blue-500 ${className}`}>
      <ColdWaterIndicator />
      <span className="text-xs font-medium">Cold</span>
    </span>
  );
}

// Export all icons for convenience
export { Zap, Droplets, Flame, TrendingUp, Calculator };
