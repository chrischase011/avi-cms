import { api } from '@/services/api'
import type { ItemResponse, ListResponse, Page, PageInput, PageListParams, PageSummary } from '@/types/api'

export const pagesService = {
  list: (params: PageListParams) => api.get<ListResponse<PageSummary>>('/pages', params),
  get: (id: number) => api.get<ItemResponse<Page>>(`/pages/${id}`).then((r) => r.data),
  create: (input: PageInput) => api.post<ItemResponse<Page>>('/pages', input).then((r) => r.data),
  update: (id: number, input: Partial<PageInput>) =>
    api.patch<ItemResponse<Page>>(`/pages/${id}`, input).then((r) => r.data),
  publish: (id: number) => api.post<ItemResponse<Page>>(`/pages/${id}/publish`).then((r) => r.data),
  unpublish: (id: number) => api.post<ItemResponse<Page>>(`/pages/${id}/unpublish`).then((r) => r.data),
  remove: (id: number) => api.delete(`/pages/${id}`),
}
