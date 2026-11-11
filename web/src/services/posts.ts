import { api } from '@/services/api'
import type { ItemResponse, ListResponse, Post, PostInput, PostListParams, PostSummary } from '@/types/api'

export const postsService = {
  list: (params: PostListParams) => api.get<ListResponse<PostSummary>>('/posts', params),
  get: (id: number) => api.get<ItemResponse<Post>>(`/posts/${id}`).then((r) => r.data),
  create: (input: PostInput) => api.post<ItemResponse<Post>>('/posts', input).then((r) => r.data),
  update: (id: number, input: Partial<PostInput>) =>
    api.patch<ItemResponse<Post>>(`/posts/${id}`, input).then((r) => r.data),
  publish: (id: number) => api.post<ItemResponse<Post>>(`/posts/${id}/publish`).then((r) => r.data),
  unpublish: (id: number) => api.post<ItemResponse<Post>>(`/posts/${id}/unpublish`).then((r) => r.data),
  remove: (id: number) => api.delete(`/posts/${id}`),
}
