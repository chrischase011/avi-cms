import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { pagesService } from '@/services/pages'
import type { Page, PageInput, PageListParams } from '@/types/api'

export function usePages(params: PageListParams) {
  return useQuery({
    queryKey: queryKeys.pages.list(params),
    queryFn: () => pagesService.list(params),
    placeholderData: keepPreviousData,
  })
}

export function usePage(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.pages.detail(id ?? 0),
    queryFn: () => pagesService.get(id ?? 0),
    enabled: id !== undefined,
  })
}

function usePageCacheSync() {
  const queryClient = useQueryClient()
  return (page?: Page) => {
    if (page) queryClient.setQueryData(queryKeys.pages.detail(page.id), page)
    void queryClient.invalidateQueries({ queryKey: queryKeys.pages.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
  }
}

export function useCreatePage() {
  const sync = usePageCacheSync()
  return useMutation({ mutationFn: (input: PageInput) => pagesService.create(input), onSuccess: sync })
}

export function useUpdatePage() {
  const sync = usePageCacheSync()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<PageInput> }) => pagesService.update(id, input),
    onSuccess: sync,
  })
}

export function usePublishPage() {
  const sync = usePageCacheSync()
  return useMutation({
    mutationFn: ({ id, publish }: { id: number; publish: boolean }) =>
      publish ? pagesService.publish(id) : pagesService.unpublish(id),
    onSuccess: sync,
  })
}

export function useDeletePage() {
  const queryClient = useQueryClient()
  const sync = usePageCacheSync()
  return useMutation({
    mutationFn: (id: number) => pagesService.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.pages.detail(id) })
      sync()
    },
  })
}
