import { type RouteConfig, index } from "@react-router/dev/routes";

/**
 * Route configuration for the Energy Tracker application
 * 
 * Routes:
 * - / (index): Dashboard - Main entry point showing consumption data
 */
export default [index("routes/dashboard.tsx")] satisfies RouteConfig;
