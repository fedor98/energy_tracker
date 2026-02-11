/**
 * Page Layouts - Barrel Export
 *
 * Central export point for all page layout components.
 * These components provide consistent layout and styling
 * for form pages (Add, Reset, Edit routes).
 *
 * Usage:
 * import { PageLayout, DateSection, FormFooter } from '../components/page-layouts';
 */

export { PageLayout } from './PageLayout';
export { DateSection } from './DateSection';
export { FormFooter } from './FormFooter';

// Re-export types
export type { PageLayoutProps } from './PageLayout';
export type { DateSectionProps } from './DateSection';
export type { FormFooterProps } from './FormFooter';
