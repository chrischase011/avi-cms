import { api } from '@/services/api'
import type { DashboardData, ItemResponse } from '@/types/api'

export const dashboardService = {
  get: () => api.get<ItemResponse<DashboardData>>('/dashboard').then((r) => r.data),
}
