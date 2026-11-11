import { Fragment, useEffect } from 'react'
import { Link, useMatches } from 'react-router'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { isRouteHandle } from '@/router/route-handle'

interface Crumb {
  label: string
  to: string
}

function useCrumbs(): Crumb[] {
  const matches = useMatches()
  const crumbs: Crumb[] = []
  for (const match of matches) {
    if (!isRouteHandle(match.handle) || !match.handle.crumb) continue
    const previous = crumbs[crumbs.length - 1]
    // Index routes repeat their parent's path; keep a single crumb.
    if (previous && previous.to === match.pathname) {
      previous.label = match.handle.crumb
      continue
    }
    crumbs.push({ label: match.handle.crumb, to: match.pathname })
  }
  return crumbs
}

export function Breadcrumbs() {
  const crumbs = useCrumbs()
  const currentLabel = crumbs[crumbs.length - 1]?.label

  useEffect(() => {
    document.title = currentLabel ? `${currentLabel} · Avi CMS` : 'Avi CMS'
  }, [currentLabel])

  if (crumbs.length === 0) return null

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1
          return (
            <Fragment key={crumb.to + crumb.label}>
              {index > 0 ? <BreadcrumbSeparator className={index < crumbs.length - 1 ? 'hidden md:block' : undefined} /> : null}
              <BreadcrumbItem className={!last ? 'hidden md:inline-flex' : undefined}>
                {last ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.to}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
