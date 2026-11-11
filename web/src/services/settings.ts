import { api } from '@/services/api'
import type { ItemResponse, Settings, SettingsInput } from '@/types/api'

export const settingsService = {
  get: () => api.get<ItemResponse<Settings>>('/settings').then((r) => r.data),
  update: (input: SettingsInput) => api.put<ItemResponse<Settings>>('/settings', input).then((r) => r.data),
}
