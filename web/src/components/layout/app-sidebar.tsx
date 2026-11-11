import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { useAuth } from '@/hooks/use-auth'
import { useSettings } from '@/hooks/use-settings'
import { hasRole } from '@/lib/permissions'
import { NAV_SECTIONS } from '@/router/navigation'

function isActivePath(pathname: string, to: string, end?: boolean): boolean {
  if (end) return pathname === to
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function AppSidebar() {
  const { user } = useAuth()
  const { data: settings } = useSettings()
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()

  // Close the mobile sheet after navigating.
  useEffect(() => {
    if (isMobile) setOpenMobile(false)
  }, [pathname, isMobile, setOpenMobile])

  const siteName = settings?.siteName || 'Avi CMS'

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={siteName}>
              <NavLink to="/">
                <span className="flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                  {settings?.logoUrl ? (
                    <img src={settings.logoUrl} alt="" className="size-full object-cover" />
                  ) : (
                    'A'
                  )}
                </span>
                <span className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold text-sidebar-accent-foreground">{siteName}</span>
                  <span className="truncate text-xs text-muted-foreground">Content management</span>
                </span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((item) => !item.roles || hasRole(user, item.roles))
          if (items.length === 0) return null
          return (
            <SidebarGroup key={section.label}>
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const active = isActivePath(pathname, item.to, item.end)
                    return (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                          <NavLink to={item.to} end={item.end} aria-current={active ? 'page' : undefined}>
                            <item.icon aria-hidden />
                            <span>{item.label}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
