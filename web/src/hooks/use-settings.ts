import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { settingsService } from '@/services/settings'
import type { SettingsInput } from '@/types/api'

export function useSettings() {
  return useQuery({ queryKey: queryKeys.settings, queryFn: settingsService.get, staleTime: 5 * 60_000 })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SettingsInput) => settingsService.update(input),
    onSuccess: (settings) => queryClient.setQueryData(queryKeys.settings, settings),
  })
}
