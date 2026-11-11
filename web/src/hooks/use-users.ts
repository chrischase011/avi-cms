import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { usersService } from '@/services/users'
import type { CreateUserInput, UpdateUserInput, UserListParams } from '@/types/api'

export function useUsers(params: UserListParams) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => usersService.list(params),
    placeholderData: keepPreviousData,
  })
}

function useUsersSync() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
  }
}

export function useCreateUser() {
  const sync = useUsersSync()
  return useMutation({ mutationFn: (input: CreateUserInput) => usersService.create(input), onSuccess: () => sync() })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  const sync = useUsersSync()
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateUserInput }) => usersService.update(id, input),
    onSuccess: () => {
      sync()
      // The signed-in user may have renamed themselves.
      void queryClient.invalidateQueries({ queryKey: queryKeys.me })
    },
  })
}

export function useSetUserPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) => usersService.setPassword(id, password),
  })
}
