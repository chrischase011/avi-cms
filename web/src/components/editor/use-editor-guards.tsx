import { useCallback, useEffect, useRef } from 'react'
import { useBlocker } from 'react-router'
import { ConfirmDialog } from '@/components/common/confirm-dialog'

/**
 * Blocks in-app navigation and tab close while a form has unsaved changes.
 * Call `allowNextNavigation()` right before navigating after a save/delete.
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  const skipRef = useRef(false)
  const dirtyRef = useRef(isDirty)
  useEffect(() => {
    dirtyRef.current = isDirty
  }, [isDirty])

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (skipRef.current) {
      skipRef.current = false
      return false
    }
    return dirtyRef.current && currentLocation.pathname !== nextLocation.pathname
  })

  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  const allowNextNavigation = useCallback(() => {
    skipRef.current = true
  }, [])

  const dialog = (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      onOpenChange={(open) => {
        if (!open && blocker.state === 'blocked') blocker.reset()
      }}
      title="Discard unsaved changes?"
      description="You have changes that have not been saved. Leaving this page will discard them."
      confirmLabel="Discard changes"
      cancelLabel="Keep editing"
      destructive
      onConfirm={() => {
        if (blocker.state === 'blocked') blocker.proceed()
      }}
    />
  )

  return { allowNextNavigation, dialog }
}

/** Ctrl/Cmd+S runs `onSave` instead of the browser's "save page". */
export function useSaveShortcut(onSave: () => void, enabled = true) {
  const saveRef = useRef(onSave)
  useEffect(() => {
    saveRef.current = onSave
  }, [onSave])

  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        saveRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
