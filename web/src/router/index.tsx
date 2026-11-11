import { createBrowserRouter, type RouteObject } from 'react-router'
import { FullPageLoader } from '@/components/common/loading'
import { AdminLayout } from '@/layouts/admin-layout'
import { AuthLayout } from '@/layouts/auth-layout'
import { RouteErrorBoundary } from '@/pages/route-error-page'
import { GuestRoute, ProtectedRoute, RequireRole } from '@/router/guards'
import type { RouteHandle } from '@/router/route-handle'

const crumb = (label: string): RouteHandle => ({ crumb: label })

/** Pages are code-split; the editor (Tiptap) is the heaviest chunk. */
const routes: RouteObject[] = [
  {
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <FullPageLoader />,
    children: [
      {
        element: <GuestRoute />,
        children: [
          {
            path: '/login',
            element: <AuthLayout />,
            children: [
              {
                index: true,
                lazy: async () => ({ Component: (await import('@/pages/login-page')).LoginPage }),
              },
            ],
          },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/',
            element: <AdminLayout />,
            handle: crumb('Dashboard'),
            children: [
              {
                errorElement: <RouteErrorBoundary inline />,
                children: [
                  {
                    index: true,
                    lazy: async () => ({ Component: (await import('@/pages/dashboard-page')).DashboardPage }),
                  },
                  {
                    path: 'posts',
                    handle: crumb('Posts'),
                    children: [
                      {
                        index: true,
                        lazy: async () => ({
                          Component: (await import('@/pages/posts/posts-list-page')).PostsListPage,
                        }),
                      },
                      {
                        path: 'create',
                        handle: crumb('New post'),
                        lazy: async () => ({
                          Component: (await import('@/pages/posts/post-editor-page')).PostEditorPage,
                        }),
                      },
                      {
                        path: ':id/edit',
                        handle: crumb('Edit post'),
                        lazy: async () => ({
                          Component: (await import('@/pages/posts/post-editor-page')).PostEditorPage,
                        }),
                      },
                    ],
                  },
                  {
                    path: 'pages',
                    handle: crumb('Pages'),
                    element: <RequireRole roles={['admin', 'editor']} />,
                    children: [
                      {
                        index: true,
                        lazy: async () => ({
                          Component: (await import('@/pages/pages/pages-list-page')).PagesListPage,
                        }),
                      },
                      {
                        path: 'create',
                        handle: crumb('New page'),
                        lazy: async () => ({
                          Component: (await import('@/pages/pages/page-editor-page')).PageEditorPage,
                        }),
                      },
                      {
                        path: ':id/edit',
                        handle: crumb('Edit page'),
                        lazy: async () => ({
                          Component: (await import('@/pages/pages/page-editor-page')).PageEditorPage,
                        }),
                      },
                    ],
                  },
                  {
                    path: 'categories',
                    handle: crumb('Categories'),
                    lazy: async () => ({ Component: (await import('@/pages/categories-page')).CategoriesPage }),
                  },
                  {
                    path: 'tags',
                    handle: crumb('Tags'),
                    lazy: async () => ({ Component: (await import('@/pages/tags-page')).TagsPage }),
                  },
                  {
                    path: 'media',
                    handle: crumb('Media'),
                    lazy: async () => ({ Component: (await import('@/pages/media-page')).MediaPage }),
                  },
                  {
                    path: 'users',
                    handle: crumb('Users'),
                    element: <RequireRole roles={['admin']} />,
                    children: [
                      {
                        index: true,
                        lazy: async () => ({ Component: (await import('@/pages/users-page')).UsersPage }),
                      },
                    ],
                  },
                  {
                    path: 'settings',
                    handle: crumb('Settings'),
                    lazy: async () => ({ Component: (await import('@/pages/settings-page')).SettingsPage }),
                  },
                  {
                    path: 'account',
                    handle: crumb('Account'),
                    lazy: async () => ({ Component: (await import('@/pages/account-page')).AccountPage }),
                  },
                  {
                    path: '*',
                    handle: crumb('Not found'),
                    lazy: async () => ({ Component: (await import('@/pages/not-found-page')).NotFoundPage }),
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
