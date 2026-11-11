// Mirrors docs/API.md. Keep in sync with the backend contract.

export type Role = 'admin' | 'editor' | 'author'
export type Status = 'draft' | 'published' | 'archived'

export interface AuthUser {
  id: number
  email: string
  name: string
  role: Role
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface ItemResponse<T> {
  data: T
}

export interface ListResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface ValidationIssue {
  in: string
  path: Array<string | number>
  message: string
}

export interface ErrorEnvelope {
  statusCode: number
  error: string
  message: string
  details?: { issues?: ValidationIssue[] } & Record<string, unknown>
}

export interface ListParams {
  page?: number
  pageSize?: number
  search?: string
}

export interface UserRef {
  id: number
  name: string
}

export interface Media {
  id: number
  url: string
  originalName: string
  mimeType: string
  size: number
  alt: string
  createdAt: string
  uploadedBy: UserRef | null
}

export interface MediaLimits {
  maxSize: number
  accept: string[]
}

export interface CategoryRef {
  id: number
  name: string
  slug: string
}

export interface TagRef {
  id: number
  name: string
  slug: string
}

export interface PostSummary {
  id: number
  title: string
  slug: string
  excerpt: string
  status: Status
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  author: UserRef
  category: CategoryRef | null
  tags: TagRef[]
  featuredImage: Media | null
}

/** `content` is sanitized HTML. */
export interface Post extends PostSummary {
  content: string
}

export interface Page {
  id: number
  title: string
  slug: string
  content: string
  status: Status
  seoTitle: string
  seoDescription: string
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  author: UserRef | null
}

export type PageSummary = Omit<Page, 'content'>

export interface Category {
  id: number
  name: string
  slug: string
  description: string
  postCount: number
  createdAt: string
  updatedAt: string
}

export interface Tag {
  id: number
  name: string
  slug: string
  postCount: number
  createdAt: string
  updatedAt: string
}

export interface User {
  id: number
  email: string
  name: string
  role: Role
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Settings {
  siteName: string
  siteDescription: string
  siteUrl: string
  logoId: number | null
  faviconId: number | null
  /** Resolved from media, read-only. */
  logoUrl: string | null
  /** Resolved from media, read-only. */
  faviconUrl: string | null
  defaultSeoTitle: string
  defaultSeoDescription: string
  postsPerPage: number
}

export type SettingsInput = Partial<Omit<Settings, 'logoUrl' | 'faviconUrl'>>

export interface DashboardStats {
  totalPosts: number
  publishedPosts: number
  draftPosts: number
  archivedPosts: number
  totalPages: number
  totalUsers: number
  totalCategories: number
  totalTags: number
  totalMedia: number
}

export interface DashboardData {
  stats: DashboardStats
  recentPosts: PostSummary[]
  recentlyUpdated: PostSummary[]
  recentPages: PageSummary[]
  postsPerMonth: Array<{ month: string; count: number }>
}

// ---- Request bodies & query params ----

export interface LoginInput {
  email: string
  password: string
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

export type PostSort = 'createdAt' | 'updatedAt' | 'publishedAt' | 'title'
export type SortOrder = 'asc' | 'desc'

export interface PostListParams extends ListParams {
  status?: Status
  categoryId?: number
  tagId?: number
  authorId?: number
  sort?: PostSort
  order?: SortOrder
}

export interface PostInput {
  title: string
  slug?: string
  excerpt?: string
  content?: string
  status?: Status
  categoryId?: number | null
  tagIds?: number[]
  featuredImageId?: number | null
  publishedAt?: string | null
}

export interface PageListParams extends ListParams {
  status?: Status
}

export interface PageInput {
  title: string
  slug?: string
  content?: string
  status?: Status
  seoTitle?: string
  seoDescription?: string
}

export interface CategoryInput {
  name: string
  slug?: string
  description?: string
}

export interface TagInput {
  name: string
  slug?: string
}

export type UserStatusFilter = 'active' | 'inactive'

export interface UserListParams extends ListParams {
  role?: Role
  status?: UserStatusFilter
}

export interface CreateUserInput {
  email: string
  name: string
  role: Role
  password: string
  isActive?: boolean
}

export interface UpdateUserInput {
  email?: string
  name?: string
  role?: Role
  isActive?: boolean
}
