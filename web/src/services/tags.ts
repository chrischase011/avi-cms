import { api } from '@/services/api'
import type { ItemResponse, ListParams, ListResponse, Tag, TagInput } from '@/types/api'

export const tagsService = {
  list: (params: ListParams) => api.get<ListResponse<Tag>>('/tags', params),
  create: (input: TagInput) => api.post<ItemResponse<Tag>>('/tags', input).then((r) => r.data),
  update: (id: number, input: Partial<TagInput>) =>
    api.patch<ItemResponse<Tag>>(`/tags/${id}`, input).then((r) => r.data),
  remove: (id: number) => api.delete(`/tags/${id}`),
}
