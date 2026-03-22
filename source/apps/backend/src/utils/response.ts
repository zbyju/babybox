/**
 * Standardized API response helpers.
 * All routes should use these for consistent response format.
 */

export function successResponse<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}

export function errorResponse(
  error: string,
  details?: unknown,
): { success: false; error: string; details?: unknown } {
  if (details !== undefined) {
    return { success: false, error, details };
  }
  return { success: false, error };
}
