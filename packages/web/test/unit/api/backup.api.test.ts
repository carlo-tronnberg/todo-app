import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}))

vi.mock('../../../src/api/client', () => ({
  apiClient: { get: mockGet, post: mockPost },
}))

import { backupApi } from '../../../src/api/backup.api'

beforeEach(() => {
  vi.clearAllMocks()
  // Provide browser API stubs
  global.URL.createObjectURL = vi.fn().mockReturnValue('blob:fake-url')
  global.URL.revokeObjectURL = vi.fn()
})

describe('backupApi.download', () => {
  it('GETs /backup with responseType blob and triggers download with content-disposition filename', async () => {
    const fakeBlob = new Blob(['{}'], { type: 'application/json' })
    mockGet.mockResolvedValue({
      data: fakeBlob,
      headers: { 'content-disposition': 'attachment; filename="todo-backup-2024-06-15.json"' },
    })

    // Stub document.createElement to intercept anchor creation
    const fakeAnchor = { href: '', download: '', click: vi.fn() }
    vi.spyOn(document, 'createElement').mockReturnValueOnce(fakeAnchor as unknown as HTMLElement)

    await backupApi.download()

    expect(mockGet).toHaveBeenCalledWith('/backup', { responseType: 'blob' })
    expect(URL.createObjectURL).toHaveBeenCalledWith(fakeBlob)
    expect(fakeAnchor.download).toBe('todo-backup-2024-06-15.json')
    expect(fakeAnchor.click).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url')
  })

  it('uses fallback filename when content-disposition header is absent', async () => {
    const fakeBlob = new Blob(['{}'], { type: 'application/json' })
    mockGet.mockResolvedValue({
      data: fakeBlob,
      headers: {},
    })

    const fakeAnchor = { href: '', download: '', click: vi.fn() }
    vi.spyOn(document, 'createElement').mockReturnValueOnce(fakeAnchor as unknown as HTMLElement)

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T00:00:00Z'))

    await backupApi.download()

    // Filename should be the default pattern
    expect(fakeAnchor.download).toMatch(/^todo-backup-\d{4}-\d{2}-\d{2}\.json$/)

    vi.useRealTimers()
  })

  it('uses fallback filename when content-disposition does not match', async () => {
    const fakeBlob = new Blob(['{}'], { type: 'application/json' })
    mockGet.mockResolvedValue({
      data: fakeBlob,
      headers: { 'content-disposition': 'attachment' },
    })

    const fakeAnchor = { href: '', download: '', click: vi.fn() }
    vi.spyOn(document, 'createElement').mockReturnValueOnce(fakeAnchor as unknown as HTMLElement)

    await backupApi.download()

    expect(fakeAnchor.download).toMatch(/^todo-backup-\d{4}-\d{2}-\d{2}\.json$/)
  })
})

describe('backupApi.restore', () => {
  it('POSTs /backup/restore with data and returns result', async () => {
    const fakeResult = { lists: 3, items: 12 }
    mockPost.mockResolvedValue({ data: fakeResult })

    const payload = { lists: [], items: [] }
    const result = await backupApi.restore(payload)

    expect(mockPost).toHaveBeenCalledWith('/backup/restore', payload)
    expect(result).toEqual(fakeResult)
  })
})
