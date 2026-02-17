/**
 * Skeleton Components - Loading placeholders for dashboard UI
 *
 * These components provide visual feedback during data loading:
 * - FilterSkeleton: Placeholder for the filter section with input fields
 * - ContentSkeleton: Placeholder for tab content (charts/tables)
 *
 * Uses Tailwind's animate-pulse utility for the pulsing effect.
 */

/**
 * Skeleton for filter section loading state
 * Mimics the layout of date inputs and buttons
 */
export function FilterSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}

/**
 * Skeleton for tab content loading state
 * Mimics the layout of title, chart area, and table rows
 */
export function ContentSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      <div className="h-64 bg-gray-200 rounded"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  );
}
