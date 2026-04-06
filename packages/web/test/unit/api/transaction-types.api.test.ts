import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGet, mockPost, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockDelete: vi.fn(),
}))

vi.mock('../../../src/api/client', () => ({
  apiClient: { get: mockGet, post: mockPost, delete: mockDelete },
}))

import { transactionTypesApi } from '../../../src/api/transaction-types.api'

beforeEach(() => vi.clearAllMocks())

describe('transactionTypesApi.getAll', () => {
  it('GETs /transaction-types', async () => {
    mockGet.mockResolvedValue({ data: [{ id: '1', name: 'Autogiro' }] })
    const result = await transactionTypesApi.getAll()
    expect(mockGet).toHaveBeenCalledWith('/transaction-types')
    expect(result).toEqual([{ id: '1', name: 'Autogiro' }])
  })
})

describe('transactionTypesApi.create', () => {
  it('POSTs to /transaction-types', async () => {
    mockPost.mockResolvedValue({ data: { id: '2', name: 'Swish' } })
    const result = await transactionTypesApi.create('Swish')
    expect(mockPost).toHaveBeenCalledWith('/transaction-types', { name: 'Swish' })
    expect(result.name).toBe('Swish')
  })
})

describe('transactionTypesApi.remove', () => {
  it('DELETEs /transaction-types/:id', async () => {
    mockDelete.mockResolvedValue({})
    await transactionTypesApi.remove('1')
    expect(mockDelete).toHaveBeenCalledWith('/transaction-types/1')
  })
})
