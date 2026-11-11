import type { ListParams, PageListParams, PostListParams, UserListParams } from '@/types/api'

export const queryKeys = {
  me: ['auth', 'me'] as const,
  dashboard: ['dashboard'] as const,
  posts: {
    all: ['posts'] as const,
    list: (params: PostListParams) => ['posts', 'list', params] as const,
    detail: (id: number) => ['posts', 'detail', id] as const,
  },
  pages: {
    all: ['pages'] as const,
    list: (params: PageListParams) => ['pages', 'list', params] as const,
    detail: (id: number) => ['pages', 'detail', id] as const,
  },
  categories: {
    all: ['categories'] as const,
    list: (params: ListParams) => ['categories', 'list', params] as const,
  },
  tags: {
    all: ['tags'] as const,
    list: (params: ListParams) => ['tags', 'list', params] as const,
  },
  media: {
    all: ['media'] as const,
    list: (params: ListParams) => ['media', 'list', params] as const,
    limits: ['media-limits'] as const,
  },
  users: {
    all: ['users'] as const,
    list: (params: UserListParams) => ['users', 'list', params] as const,
  },
  settings: ['settings'] as const,
}
