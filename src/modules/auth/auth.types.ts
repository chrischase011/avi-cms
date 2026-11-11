import type { UserRole } from '../../database/schema.js';

/** The signed-in user, as the request pipeline sees it. */
export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

declare module '@avijs/core' {
  interface AviState {
    /** Set by AuthGuard. */
    user?: AuthUser;
  }
}
