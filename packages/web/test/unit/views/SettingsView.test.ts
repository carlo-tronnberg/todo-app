import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import SettingsView from '../../../src/views/SettingsView.vue'

const { mockBackupApi } = vi.hoisted(() => ({
  mockBackupApi: {
    download: vi.fn(),
    restore: vi.fn(),
  },
}))

vi.mock('../../../src/api/backup.api', () => ({ backupApi: mockBackupApi }))

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

  function mountSettings() {
    const router = makeRouter()
    const wrapper = mount(SettingsView, {
      global: { plugins: [pinia, router] },
    })
    return { wrapper }
  }

  it('renders the Settings heading', () => {
    const { wrapper } = mountSettings()
    expect(wrapper.text()).toContain('Settings')
  })

  it('renders the Backup & Restore section', () => {
    const { wrapper } = mountSettings()
    expect(wrapper.text()).toContain('Backup')
    expect(wrapper.text()).toContain('Download backup')
  })

  it('calls backupApi.download when Download backup button is clicked', async () => {
    mockBackupApi.download.mockResolvedValue(undefined)
    const { wrapper } = mountSettings()

    const downloadBtn = wrapper.find('button.btn-secondary')
    await downloadBtn.trigger('click')
    await flushPromises()

    expect(mockBackupApi.download).toHaveBeenCalled()
  })

  it('shows error when backupApi.download fails', async () => {
    mockBackupApi.download.mockRejectedValue(new Error('Network failure'))
    const { wrapper } = mountSettings()

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
    const { wrapper } = mountSettings()

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
    const { wrapper } = mountSettings()

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
    const { wrapper } = mountSettings()

    const fakeFile = fakeFileWith('{}')
    const event = { target: { files: [fakeFile], value: '' } }
    await (
      wrapper.vm as unknown as { handleRestoreFile: (e: Event) => Promise<void> }
    ).handleRestoreFile(event as unknown as Event)
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to restore backup')
  })

  it('does nothing when no file is selected', async () => {
    const { wrapper } = mountSettings()

    const event = { target: { files: [], value: '' } }
    await (
      wrapper.vm as unknown as { handleRestoreFile: (e: Event) => Promise<void> }
    ).handleRestoreFile(event as unknown as Event)
    await flushPromises()

    expect(mockBackupApi.restore).not.toHaveBeenCalled()
  })

  it('shows the version number', () => {
    const { wrapper } = mountSettings()
    expect(wrapper.text()).toContain('Version')
  })
})
