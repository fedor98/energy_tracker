import { type RouteConfig, index, route } from "@react-router/dev/routes";

/**
 * Route configuration for the Energy Tracker application
 * 
 * Routes:
 * - / (index): Dashboard - Main entry point showing consumption data
 * - /setup: Setup Wizard - Initial configuration for new installations
 */
export default [
  index("routes/dashboard.tsx"),
  route("setup", "routes/setup.tsx"),
] satisfies RouteConfig;
