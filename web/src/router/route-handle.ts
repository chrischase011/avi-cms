/** Attached to routes via `handle` and read by the breadcrumbs. */
export interface RouteHandle {
  crumb?: string
}

export function isRouteHandle(value: unknown): value is RouteHandle {
  return typeof value === 'object' && value !== null && 'crumb' in value
}
