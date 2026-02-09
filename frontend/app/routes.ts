import { type RouteConfig, index, route } from "@react-router/dev/routes";

/**
 * Route configuration for the Energy Tracker application
 * 
 * Routes:
 * - / (index): Dashboard - Main entry point showing consumption data
 * - /setup: Setup Wizard - Initial configuration for new installations
 * - /add: Add Reading - Multi-step wizard for entering new meter readings
 */
export default [
  index("routes/dashboard.tsx"),
  route("setup", "routes/setup.tsx"),
  route("add", "routes/add.tsx"),
] satisfies RouteConfig;
