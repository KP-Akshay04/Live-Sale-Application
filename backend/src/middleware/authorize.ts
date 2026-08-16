import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth.types.js';

/**
 * Normalizes role strings for case-insensitive and underscore/space-agnostic matching.
 * e.g., "Super Admin", "SUPER_ADMIN", "super_admin" all normalize to "superadmin".
 */
function normalizeRole(role: string): string {
  return role.toLowerCase().replace(/[\s_-]+/g, '');
}

/**
 * Middleware factory that restricts access to requests made by users with one of the allowed roles.
 * Example usage:
 *   router.get('/admin-only', authenticate, requireRoles('Super Admin'), ...);
 *   router.get('/inventory', authenticate, requireRoles('Super Admin', 'Depot Person'), ...);
 */
export function requireRoles(...allowedRoles: string[]) {
  const normalizedAllowed = allowedRoles.map(normalizeRole);

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required before authorization check.',
          statusCode: 401,
          code: 'UNAUTHENTICATED',
        },
      });
      return;
    }

    const userRole = req.user.role ? normalizeRole(req.user.role) : '';
    const userRoleCode = req.user.roleCode ? normalizeRole(req.user.roleCode) : '';

    const hasPermission =
      normalizedAllowed.includes(userRole) || normalizedAllowed.includes(userRoleCode);

    if (!hasPermission) {
      res.status(403).json({
        success: false,
        error: {
          message: `Access denied. Requires one of: ${allowedRoles.join(', ')}`,
          statusCode: 403,
          code: 'FORBIDDEN',
        },
      });
      return;
    }

    next();
  };
}

/**
 * Convenience single-role middleware alias.
 */
export function requireRole(role: string) {
  return requireRoles(role);
}
