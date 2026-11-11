import { Outlet } from 'react-router'
import { ThemeToggle } from '@/components/layout/theme-toggle'

export function AuthLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-muted/40">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-base font-semibold text-primary-foreground">
              A
            </span>
            <div>
              <p className="text-lg font-semibold tracking-tight">Avi CMS</p>
              <p className="text-sm text-muted-foreground">Content management</p>
            </div>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
