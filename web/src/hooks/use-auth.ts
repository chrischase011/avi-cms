import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { isApiError } from '@/services/api'
import { authService } from '@/services/auth'
import type { AuthUser, ChangePasswordInput, LoginInput } from '@/types/api'

async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    return await authService.me()
  } catch (error) {
    if (isApiError(error) && error.status === 401) return null
    throw error
  }
}

/** Current user from GET /api/auth/me; `user` is null when signed out. */
export function useAuth() {
  const query = useQuery({
    queryKey: queryKeys.me,
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60_000,
    retry: false,
  })
  return {
    user: query.data ?? null,
    isLoading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  }
}

/** Like useAuth, but for screens rendered behind ProtectedRoute. */
export function useCurrentUser(): AuthUser {
  const { user } = useAuth()
  if (!user) throw new Error('useCurrentUser must be used inside a protected route')
  return user
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: LoginInput) => authService.login(input),
    onSuccess: (user) => {
      // Drop anything cached for a previous session, then seed the new user.
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== queryKeys.me[0] })
      queryClient.setQueryData(queryKeys.me, user)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      queryClient.setQueryData(queryKeys.me, null)
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== queryKeys.me[0] })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => authService.changePassword(input),
  })
}
