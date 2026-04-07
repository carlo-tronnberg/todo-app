import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import SettingsView from '../../../src/views/SettingsView.vue'

const { mockBackupApi, mockTxTypesApi } = vi.hoisted(() => ({
  mockBackupApi: {
    download: vi.fn(),
    restore: vi.fn(),
  },
  mockTxTypesApi: {
    getAll: vi.fn().mockResolvedValue([{ id: '1', name: 'Autogiro', userId: 'u1', createdAt: '' }]),
    create: vi.fn().mockResolvedValue({ id: '2', name: 'Swish', userId: 'u1', createdAt: '' }),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('../../../src/api/backup.api', () => ({ backupApi: mockBackupApi }))
vi.mock('../../../src/api/transaction-types.api', () => ({
  transactionTypesApi: mockTxTypesApi,
}))

async function makeRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/settings', component: SettingsView },
      { path: '/:pathMatch(.*)*', redirect: '/settings' },
    ],
  })
  router.push('/settings')
  await router.isReady()
  return router
}

describe('SettingsView', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
  })

  async function mountSettings() {
    const router = await makeRouter()
    const wrapper = mount(SettingsView, {
      global: { plugins: [pinia, router] },
    })
    return { wrapper }
  }

  it('renders the Settings heading', async () => {
    const { wrapper } = await mountSettings()
    expect(wrapper.text()).toContain('Settings')
  })

  it('renders the Backup & Restore section', async () => {
    const { wrapper } = await mountSettings()
    expect(wrapper.text()).toContain('Backup')
    expect(wrapper.text()).toContain('Download backup')
  })

  it('calls backupApi.download when Download backup button is clicked', async () => {
    mockBackupApi.download.mockResolvedValue(undefined)
    const { wrapper } = await mountSettings()

    const downloadBtn = wrapper.find('button.btn-secondary')
    await downloadBtn.trigger('click')
    await flushPromises()

    expect(mockBackupApi.download).toHaveBeenCalled()
  })

  it('shows error when backupApi.download fails', async () => {
    mockBackupApi.download.mockRejectedValue(new Error('Network failure'))
    const { wrapper } = await mountSettings()

    const downloadBtn = wrapper.find('button.btn-secondary')
    await downloadBtn.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to download backup')
  })

  function fakeFileWith(content: string) {
    return { text: vi.fn().mockResolvedValue(content), name: 'backup.json', value: '' }
  }

  it('restores from file and shows success message', async () => {
    const restoreResult = { lists: 2, items: 5 }
    mockBackupApi.restore.mockResolvedValue(restoreResult)
    const { wrapper } = await mountSettings()

    const fakeData = { version: 1, lists: [] }
    const fakeFile = fakeFileWith(JSON.stringify(fakeData))
    const event = { target: { files: [fakeFile], value: '' } }
    await (
      wrapper.vm as unknown as { handleRestoreFile: (e: Event) => Promise<void> }
    ).handleRestoreFile(event as unknown as Event)
    await flushPromises()

    expect(mockBackupApi.restore).toHaveBeenCalledWith(fakeData)
    expect(wrapper.text()).toContain('Restored 2 list(s) and 5 item(s)')
  })

  it('shows error when restore fails with server message', async () => {
    const err = { response: { data: { message: 'Invalid backup format' } } }
    mockBackupApi.restore.mockRejectedValue(err)
    const { wrapper } = await mountSettings()

    const fakeData = { version: 1, lists: [] }
    const fakeFile = fakeFileWith(JSON.stringify(fakeData))
    const event = { target: { files: [fakeFile], value: '' } }
    await (
      wrapper.vm as unknown as { handleRestoreFile: (e: Event) => Promise<void> }
    ).handleRestoreFile(event as unknown as Event)
    await flushPromises()

    expect(wrapper.text()).toContain('Invalid backup format')
  })

  it('shows generic error when restore fails without server message', async () => {
    mockBackupApi.restore.mockRejectedValue(new Error('Unknown error'))
    const { wrapper } = await mountSettings()

    const fakeFile = fakeFileWith('{}')
    const event = { target: { files: [fakeFile], value: '' } }
    await (
      wrapper.vm as unknown as { handleRestoreFile: (e: Event) => Promise<void> }
    ).handleRestoreFile(event as unknown as Event)
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to restore backup')
  })

  it('does nothing when no file is selected', async () => {
    const { wrapper } = await mountSettings()

    const event = { target: { files: [], value: '' } }
    await (
      wrapper.vm as unknown as { handleRestoreFile: (e: Event) => Promise<void> }
    ).handleRestoreFile(event as unknown as Event)
    await flushPromises()

    expect(mockBackupApi.restore).not.toHaveBeenCalled()
  })

  it('shows the theme toggle', async () => {
    const { wrapper } = await mountSettings()
    expect(wrapper.text()).toContain('Theme')
  })

  it('loads transaction types on mount', async () => {
    const { wrapper } = await mountSettings()
    await flushPromises()
    expect(mockTxTypesApi.getAll).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Autogiro')
  })

  it('adds a transaction type', async () => {
    const { wrapper } = await mountSettings()
    await flushPromises()
    await (wrapper.vm as unknown as { addTxType: () => Promise<void> }).addTxType()
    // addTxType requires newTxName to be set — call directly via vm
    ;(wrapper.vm as unknown as { newTxName: string }).newTxName = 'Swish'
    await (wrapper.vm as unknown as { addTxType: () => Promise<void> }).addTxType()
    await flushPromises()
    expect(mockTxTypesApi.create).toHaveBeenCalledWith('Swish')
  })

  it('removes a transaction type', async () => {
    const { wrapper } = await mountSettings()
    await flushPromises()
    await (wrapper.vm as unknown as { removeTxType: (id: string) => Promise<void> }).removeTxType(
      '1'
    )
    await flushPromises()
    expect(mockTxTypesApi.remove).toHaveBeenCalledWith('1')
  })

  it('toggles theme when button is clicked', async () => {
    const { wrapper } = await mountSettings()
    await flushPromises()
    const themeBtn = wrapper.findAll('.btn-sm').find((b) => b.text().includes('mode'))
    expect(themeBtn).toBeTruthy()
    await themeBtn!.trigger('click')
    // Just verify it doesn't throw
  })

  it('handleRestoreFile does nothing when no file is selected', async () => {
    const { wrapper } = await mountSettings()
    await flushPromises()
    const event = { target: { files: null, value: '' } }
    await (
      wrapper.vm as unknown as { handleRestoreFile: (e: Event) => Promise<void> }
    ).handleRestoreFile(event as unknown as Event)
    await flushPromises()
    expect(mockBackupApi.restore).not.toHaveBeenCalled()
  })
})
