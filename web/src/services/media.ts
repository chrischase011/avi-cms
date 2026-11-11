import { api } from '@/services/api'
import type { ItemResponse, ListParams, ListResponse, Media, MediaLimits } from '@/types/api'

export const mediaService = {
  list: (params: ListParams) => api.get<ListResponse<Media>>('/media', params),
  limits: () => api.get<ItemResponse<MediaLimits>>('/media/limits').then((r) => r.data),
  upload: (file: File, alt?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (alt) form.append('alt', alt)
    return api.upload<ItemResponse<Media>>('/media', form).then((r) => r.data)
  },
  update: (id: number, input: { alt: string }) =>
    api.patch<ItemResponse<Media>>(`/media/${id}`, input).then((r) => r.data),
  remove: (id: number) => api.delete(`/media/${id}`),
}
