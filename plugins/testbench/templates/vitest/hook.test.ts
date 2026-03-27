import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// import { useHookName } from './useHookName'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useHookName', () => {
  it('returns initial loading state', () => {
    // const { result } = renderHook(() => useHookName(), {
    //   wrapper: createWrapper(),
    // })
    // expect(result.current.data).toBeUndefined()
    // expect(result.current.isLoading).toBe(true)
  })

  it('fetches data successfully', async () => {
    // vi.mocked(supabase.from).mockReturnValue(
    //   mockSupabaseQuery([{ id: 1, name: 'Item' }])
    // )
    // const { result } = renderHook(() => useHookName(), {
    //   wrapper: createWrapper(),
    // })
    // await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // expect(result.current.data).toEqual([{ id: 1, name: 'Item' }])
  })

  it('handles error state', async () => {
    // vi.mocked(supabase.from).mockReturnValue(
    //   mockSupabaseQuery([], new Error('Network error'))
    // )
    // const { result } = renderHook(() => useHookName(), {
    //   wrapper: createWrapper(),
    // })
    // await waitFor(() => expect(result.current.isError).toBe(true))
    // expect(result.current.error?.message).toBe('Network error')
  })
})
