import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { postsService } from '@/services/posts'
import type { Post, PostInput, PostListParams } from '@/types/api'

export function usePosts(params: PostListParams) {
  return useQuery({
    queryKey: queryKeys.posts.list(params),
    queryFn: () => postsService.list(params),
    placeholderData: keepPreviousData,
  })
}

export function usePost(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.posts.detail(id ?? 0),
    queryFn: () => postsService.get(id ?? 0),
    enabled: id !== undefined,
  })
}

function usePostCacheSync() {
  const queryClient = useQueryClient()
  return (post?: Post) => {
    if (post) queryClient.setQueryData(queryKeys.posts.detail(post.id), post)
    void queryClient.invalidateQueries({ queryKey: queryKeys.posts.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    // Post counts on categories/tags change with posts.
    void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.tags.all })
  }
}

export function useCreatePost() {
  const sync = usePostCacheSync()
  return useMutation({ mutationFn: (input: PostInput) => postsService.create(input), onSuccess: sync })
}

export function useUpdatePost() {
  const sync = usePostCacheSync()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<PostInput> }) => postsService.update(id, input),
    onSuccess: sync,
  })
}

export function usePublishPost() {
  const sync = usePostCacheSync()
  return useMutation({
    mutationFn: ({ id, publish }: { id: number; publish: boolean }) =>
      publish ? postsService.publish(id) : postsService.unpublish(id),
    onSuccess: sync,
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()
  const sync = usePostCacheSync()
  return useMutation({
    mutationFn: (id: number) => postsService.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.posts.detail(id) })
      sync()
    },
  })
}
