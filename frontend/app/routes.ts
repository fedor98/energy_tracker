import { type RouteConfig, index, route } from "@react-router/dev/routes";

/**
 * Route configuration for the Energy Tracker application
 * 
 * Routes:
 * - / (index): Dashboard - Main entry point showing consumption data
 * - /setup: Setup Wizard - Initial configuration for new installations
 * - /add: Add Reading - Multi-step wizard for entering new meter readings
 * - /reset: Reset Meter - Record meter replacement entries
 * - /edit: Edit Readings - Edit all readings for a specific date
 */
export default [
  index("routes/dashboard.tsx"),
  route("setup", "routes/setup.tsx"),
  route("add", "routes/add.tsx"),
  route("reset", "routes/reset.tsx"),
  route("edit", "routes/edit.tsx"),
] satisfies RouteConfig;
