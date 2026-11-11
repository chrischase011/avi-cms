import { FileQuestion } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/common/empty-state'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="rounded-lg border bg-card">
      <EmptyState
        icon={FileQuestion}
        title="Page not found"
        description="The page you are looking for does not exist or has moved."
        action={
          <Button variant="outline" asChild>
            <Link to="/">Back to dashboard</Link>
          </Button>
        }
        className="py-20"
      />
    </div>
  )
}
