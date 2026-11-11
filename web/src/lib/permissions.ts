import type { AuthUser, Media, PostSummary, Role } from '@/types/api'

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  editor: 'Editor',
  author: 'Author',
}

export const ROLES: Role[] = ['admin', 'editor', 'author']

type MaybeUser = AuthUser | null | undefined

const isEditorOrAdmin = (user: MaybeUser): boolean => user?.role === 'admin' || user?.role === 'editor'

export const can = {
  publish: isEditorOrAdmin,
  managePages: isEditorOrAdmin,
  manageTaxonomy: isEditorOrAdmin,
  manageUsers: (user: MaybeUser): boolean => user?.role === 'admin',
  editSettings: (user: MaybeUser): boolean => user?.role === 'admin',
  editPost: (user: MaybeUser, post: Pick<PostSummary, 'author'>): boolean =>
    isEditorOrAdmin(user) || (!!user && post.author.id === user.id),
  deleteMedia: (user: MaybeUser, media: Pick<Media, 'uploadedBy'>): boolean =>
    isEditorOrAdmin(user) || (!!user && media.uploadedBy?.id === user.id),
}

export function hasRole(user: MaybeUser, roles: readonly Role[]): boolean {
  return !!user && roles.includes(user.role)
}
