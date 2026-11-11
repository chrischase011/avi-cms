import {
  FileText,
  Files,
  FolderTree,
  Image,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  Tags,
  Users,
} from 'lucide-react'
import type { Role } from '@/types/api'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Roles that see the item; omitted means everyone. */
  roles?: readonly Role[]
  /** Match only the exact path (for "/"). */
  end?: boolean
}

export interface NavSection {
  label: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Content',
    items: [
      { label: 'Posts', to: '/posts', icon: FileText },
      { label: 'Pages', to: '/pages', icon: Files, roles: ['admin', 'editor'] },
      { label: 'Categories', to: '/categories', icon: FolderTree },
      { label: 'Tags', to: '/tags', icon: Tags },
      { label: 'Media', to: '/media', icon: Image },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Users', to: '/users', icon: Users, roles: ['admin'] },
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
]
