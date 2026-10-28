export type UserRole = 'user' | 'admin' | 'dev' | 'fuhong_worker' | 'not_authorized';

export const ROLE_LABELS: Record<UserRole, string> = {
  user: 'User',
  admin: 'Admin',
  dev: 'Dev',
  fuhong_worker: 'FuHong Worker',
  not_authorized: 'Not Authorized',
};

export const normalizeRole = (role?: string | null): UserRole => {
  const value = (role || 'user').toLowerCase();
  return (Object.keys(ROLE_LABELS) as UserRole[]).includes(value as UserRole) ? (value as UserRole) : 'user';
};

export const canManageUsers = (role: UserRole) => role === 'admin' || role === 'dev';

export const assignableRoles = (actor: UserRole): UserRole[] =>
  canManageUsers(actor) ? ['user', 'admin', 'fuhong_worker', 'not_authorized'] : [];

export const canChangeRoleOf = (actor: UserRole, actorId: string | undefined, targetId: string, targetRole: UserRole) => {
  if (!canManageUsers(actor)) return false;
  if (actorId && actorId === targetId) return false;
  if (targetRole === 'dev') return false;
  return true;
};
