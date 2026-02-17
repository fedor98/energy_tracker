/**
 * PageLayout Component
 *
 * A reusable layout wrapper for page routes (Add, Reset, Edit).
 * Provides consistent styling including the outer container, white card,
 * header section, and error message banners.
 *
 * Features:
 * - Consistent max-width and padding
 * - White card with shadow
 * - Optional loading state with spinner
 * - Error message banner (success now uses toast notifications)
 * - Responsive design
 */

import React from 'react';

export interface PageLayoutProps {
  /** Page title displayed in the header */
  title: string;
  /** Optional description displayed below the title */
  description?: string;
  /** Page content */
  children: React.ReactNode;
  /** Whether the page is in a loading state */
  loading?: boolean;
  /** Text to display during loading */
  loadingText?: string;
  /** Error message to display */
  error?: string | null;
  /** Maximum width of the content area */
  maxWidth?: 'sm' | 'md' | 'lg';
}

const maxWidthClasses = {
  sm: 'max-w-xl',      // 576px
  md: 'max-w-2xl',     // 672px - default, matches current design
  lg: 'max-w-3xl',     // 768px
};

export function PageLayout({
  title,
  description,
  children,
  loading = false,
  loadingText = 'Loading...',
  error = null,
  maxWidth = 'md',
}: PageLayoutProps) {
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">{loadingText}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className={`${maxWidthClasses[maxWidth]} mx-auto`}>
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-8">
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
              {title}
            </h1>
            {description && (
              <p className="text-gray-600 text-center">
                {description}
              </p>
            )}
          </header>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Content */}
          {children}
        </div>
      </div>
    </div>
  );
}

export default PageLayout;
