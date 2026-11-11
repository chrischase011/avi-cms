import { api } from '@/services/api'
import type { AuthUser, ChangePasswordInput, ItemResponse, LoginInput } from '@/types/api'

export const authService = {
  csrf: () => api.get<ItemResponse<{ csrfToken: string }>>('/auth/csrf').then((r) => r.data),
  login: (input: LoginInput) => api.post<ItemResponse<AuthUser>>('/auth/login', input).then((r) => r.data),
  logout: () => api.post<void>('/auth/logout'),
  me: () => api.get<ItemResponse<AuthUser>>('/auth/me').then((r) => r.data),
  changePassword: (input: ChangePasswordInput) => api.post<void>('/auth/password', input),
}
