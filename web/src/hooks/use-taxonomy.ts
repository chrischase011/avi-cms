import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { categoriesService } from '@/services/categories'
import { tagsService } from '@/services/tags'
import type { CategoryInput, ListParams, TagInput } from '@/types/api'

/** Large enough to fill selects in the post editor and list filters. */
export const ALL_ITEMS: ListParams = { page: 1, pageSize: 100 }

function useTaxonomySync() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.tags.all })
    // Posts embed category/tag names.
    void queryClient.invalidateQueries({ queryKey: queryKeys.posts.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
  }
}

// ---- Categories

export function useCategories(params: ListParams = ALL_ITEMS) {
  return useQuery({
    queryKey: queryKeys.categories.list(params),
    queryFn: () => categoriesService.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useSaveCategory() {
  const sync = useTaxonomySync()
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: CategoryInput }) =>
      id === undefined ? categoriesService.create(input) : categoriesService.update(id, input),
    onSuccess: () => sync(),
  })
}

export function useDeleteCategory() {
  const sync = useTaxonomySync()
  return useMutation({ mutationFn: (id: number) => categoriesService.remove(id), onSuccess: () => sync() })
}

// ---- Tags

export function useTags(params: ListParams = ALL_ITEMS) {
  return useQuery({
    queryKey: queryKeys.tags.list(params),
    queryFn: () => tagsService.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useSaveTag() {
  const sync = useTaxonomySync()
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: TagInput }) =>
      id === undefined ? tagsService.create(input) : tagsService.update(id, input),
    onSuccess: () => sync(),
  })
}

export function useDeleteTag() {
  const sync = useTaxonomySync()
  return useMutation({ mutationFn: (id: number) => tagsService.remove(id), onSuccess: () => sync() })
}
