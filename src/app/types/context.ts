// Extended context type for our application
export interface AppContext {
  organizationId: string; // Required - no fallbacks, must be set by middleware
  // Add other custom context properties here as needed
  // user?: User;
  // session?: Session;
}
