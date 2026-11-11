import { api } from '@/services/api'
import type { Category, CategoryInput, ItemResponse, ListParams, ListResponse } from '@/types/api'

export const categoriesService = {
  list: (params: ListParams) => api.get<ListResponse<Category>>('/categories', params),
  create: (input: CategoryInput) => api.post<ItemResponse<Category>>('/categories', input).then((r) => r.data),
  update: (id: number, input: Partial<CategoryInput>) =>
    api.patch<ItemResponse<Category>>(`/categories/${id}`, input).then((r) => r.data),
  remove: (id: number) => api.delete(`/categories/${id}`),
}
