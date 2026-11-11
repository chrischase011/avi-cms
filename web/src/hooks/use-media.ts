import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mediaService } from '@/services/media'
import type { ListParams } from '@/types/api'

export function useMediaList(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.media.list(params),
    queryFn: () => mediaService.list(params),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useMediaLimits() {
  return useQuery({
    queryKey: queryKeys.media.limits,
    queryFn: mediaService.limits,
    staleTime: Number.POSITIVE_INFINITY,
  })
}

function useMediaSync() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.media.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
  }
}

export function useUploadMedia() {
  const sync = useMediaSync()
  return useMutation({
    mutationFn: ({ file, alt }: { file: File; alt?: string }) => mediaService.upload(file, alt),
    onSuccess: () => sync(),
  })
}

export function useUpdateMedia() {
  const sync = useMediaSync()
  return useMutation({
    mutationFn: ({ id, alt }: { id: number; alt: string }) => mediaService.update(id, { alt }),
    onSuccess: () => sync(),
  })
}

export function useDeleteMedia() {
  const queryClient = useQueryClient()
  const sync = useMediaSync()
  return useMutation({
    mutationFn: (id: number) => mediaService.remove(id),
    onSuccess: () => {
      sync()
      // Posts and settings may reference the deleted file.
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings })
    },
  })
}
