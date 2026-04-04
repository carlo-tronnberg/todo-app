import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'

// Capture the interceptor handlers when the module initialises
const { mockRequestUse, mockResponseUse } = vi.hoisted(() => ({
  mockRequestUse: vi.fn(),
  mockResponseUse: vi.fn(),
}))

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: mockRequestUse },
        response: { use: mockResponseUse },
      },
    })),
  },
}))

// Import after mock so the mock is active when client.ts initialises
import '../../../src/api/client'

let requestFulfill: (config: any) => any
let responseFulfill: (res: any) => any
let responseReject: (err: any) => Promise<never>

beforeAll(() => {
  ;[requestFulfill] = mockRequestUse.mock.calls[0]
  ;[responseFulfill, responseReject] = mockResponseUse.mock.calls[0]
})

beforeEach(() => {
  localStorage.clear()
  // Reset window.location.href in jsdom
  delete (window as any).location
  ;(window as any).location = { href: '' }
})

describe('request interceptor', () => {
  it('attaches Authorization header when token is present', () => {
    localStorage.setItem('auth_token', 'my-jwt-token')
    const config = { headers: {} as Record<string, string> }
    const result = requestFulfill(config)
    expect(result.headers.Authorization).toBe('Bearer my-jwt-token')
  })

  it('does not set Authorization header when no token', () => {
    const config = { headers: {} as Record<string, string> }
    const result = requestFulfill(config)
    expect(result.headers.Authorization).toBeUndefined()
  })
})

describe('response interceptor', () => {
  it('passes successful responses through unchanged', () => {
    const mockResponse = { data: { ok: true }, status: 200 }
    expect(responseFulfill(mockResponse)).toBe(mockResponse)
  })

  it('clears token and redirects to /login on 401', async () => {
    localStorage.setItem('auth_token', 'stale-token')
    const error = { response: { status: 401 } }
    await expect(responseReject(error)).rejects.toEqual(error)
    expect(localStorage.getItem('auth_token')).toBeNull()
    expect((window as any).location.href).toBe('/todo/login')
  })

  it('re-rejects non-401 errors without clearing token', async () => {
    localStorage.setItem('auth_token', 'valid-token')
    const error = { response: { status: 500 } }
    await expect(responseReject(error)).rejects.toEqual(error)
    expect(localStorage.getItem('auth_token')).toBe('valid-token')
  })

  it('re-rejects errors without a response object', async () => {
    const error = new Error('Network Error')
    await expect(responseReject(error)).rejects.toEqual(error)
  })
})
