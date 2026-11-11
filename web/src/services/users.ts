import { api } from '@/services/api'
import type {
  CreateUserInput,
  ItemResponse,
  ListResponse,
  UpdateUserInput,
  User,
  UserListParams,
} from '@/types/api'

export const usersService = {
  list: (params: UserListParams) => api.get<ListResponse<User>>('/users', params),
  get: (id: number) => api.get<ItemResponse<User>>(`/users/${id}`).then((r) => r.data),
  create: (input: CreateUserInput) => api.post<ItemResponse<User>>('/users', input).then((r) => r.data),
  update: (id: number, input: UpdateUserInput) =>
    api.patch<ItemResponse<User>>(`/users/${id}`, input).then((r) => r.data),
  setPassword: (id: number, password: string) => api.post<void>(`/users/${id}/password`, { password }),
}
