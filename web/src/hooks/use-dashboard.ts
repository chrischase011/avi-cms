import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { dashboardService } from '@/services/dashboard'

export function useDashboard() {
  return useQuery({ queryKey: queryKeys.dashboard, queryFn: dashboardService.get })
}
