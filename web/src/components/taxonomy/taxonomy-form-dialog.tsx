import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { type ChangeEvent, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { CharCounter, describedBy, FormField } from '@/components/common/form-field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useSaveCategory, useSaveTag } from '@/hooks/use-taxonomy'
import { applyApiErrors } from '@/lib/form-errors'
import { SLUG_PATTERN, slugify } from '@/lib/slug'
import { errorMessage } from '@/services/api'
import type { Category, Tag } from '@/types/api'

const NAME_MAX = 100
const DESCRIPTION_MAX = 500

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(NAME_MAX, `Name must be ${NAME_MAX} characters or fewer`),
  slug: z
    .string()
    .trim()
    .max(200, 'Slug must be 200 characters or fewer')
    .refine((value) => value === '' || SLUG_PATTERN.test(value), 'Use lowercase letters, numbers and hyphens'),
  description: z.string().max(DESCRIPTION_MAX, `Description must be ${DESCRIPTION_MAX} characters or fewer`),
})

type FormValues = z.infer<typeof schema>

const FIELDS = ['name', 'slug', 'description'] as const

type TaxonomyDialogProps =
  | {
      kind: 'category'
      open: boolean
      onOpenChange: (open: boolean) => void
      /** Record to edit; omit to create. */
      item?: Category | null
    }
  | {
      kind: 'tag'
      open: boolean
      onOpenChange: (open: boolean) => void
      item?: Tag | null
    }

export function TaxonomyFormDialog(props: TaxonomyDialogProps) {
  const { kind, open, onOpenChange, item } = props
  const isCategory = kind === 'category'
  const noun = isCategory ? 'category' : 'tag'
  const saveCategory = useSaveCategory()
  const saveTag = useSaveTag()
  const pending = saveCategory.isPending || saveTag.isPending

  // Slug follows the name until the user edits it (always manual when editing).
  const slugTouched = useRef(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', slug: '', description: '' },
  })
  const { register, handleSubmit, reset, setValue, setError, watch, formState } = form
  const { errors } = formState

  useEffect(() => {
    if (!open) return
    slugTouched.current = Boolean(item)
    reset({
      name: item?.name ?? '',
      slug: item?.slug ?? '',
      description: item && 'description' in item ? item.description : '',
    })
  }, [open, item, reset])

  const nameField = register('name', {
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      if (!slugTouched.current) setValue('slug', slugify(event.target.value), { shouldValidate: formState.isSubmitted })
    },
  })
  const slugField = register('slug', {
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      // Clearing the slug hands control back to the name.
      slugTouched.current = event.target.value !== ''
    },
  })

  const description = watch('description')

  const onSubmit = handleSubmit(async (values) => {
    const base = { name: values.name, slug: values.slug || undefined }
    try {
      if (isCategory) {
        await saveCategory.mutateAsync({ id: item?.id, input: { ...base, description: values.description } })
      } else {
        await saveTag.mutateAsync({ id: item?.id, input: base })
      }
      toast.success(item ? `Updated ${noun} “${values.name}”` : `Created ${noun} “${values.name}”`)
      onOpenChange(false)
    } catch (error) {
      const handled = applyApiErrors(error, setError, { fields: FIELDS, conflictField: 'slug' })
      if (!handled) toast.error(errorMessage(error, `Could not save the ${noun}`))
    }
  })

  const idPrefix = `${kind}-form`

  return (
    <Dialog open={open} onOpenChange={(next) => (pending ? undefined : onOpenChange(next))}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{item ? `Edit ${noun}` : `New ${noun}`}</DialogTitle>
            <DialogDescription>
              {isCategory
                ? 'Categories group posts by topic. Each post has at most one.'
                : 'Tags describe posts in more detail. A post can have many.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <FormField label="Name" htmlFor={`${idPrefix}-name`} error={errors.name?.message} required>
              <Input
                id={`${idPrefix}-name`}
                autoComplete="off"
                autoFocus
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={describedBy(`${idPrefix}-name`, errors.name?.message)}
                {...nameField}
              />
            </FormField>

            <FormField
              label="Slug"
              htmlFor={`${idPrefix}-slug`}
              error={errors.slug?.message}
              description="Used in URLs. Leave empty to generate it from the name."
            >
              <Input
                id={`${idPrefix}-slug`}
                autoComplete="off"
                spellCheck={false}
                className="font-mono text-[0.8rem]"
                aria-invalid={errors.slug ? true : undefined}
                aria-describedby={describedBy(`${idPrefix}-slug`, errors.slug?.message, 'description')}
                {...slugField}
              />
            </FormField>

            {isCategory ? (
              <FormField
                label="Description"
                htmlFor={`${idPrefix}-description`}
                error={errors.description?.message}
                aside={<CharCounter value={description} max={DESCRIPTION_MAX} />}
              >
                <Textarea
                  id={`${idPrefix}-description`}
                  rows={3}
                  aria-invalid={errors.description ? true : undefined}
                  aria-describedby={describedBy(`${idPrefix}-description`, errors.description?.message)}
                  {...register('description')}
                />
              </FormField>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {item ? 'Save changes' : `Create ${noun}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
