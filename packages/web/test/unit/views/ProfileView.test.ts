import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import ProfileView from '../../../src/views/ProfileView.vue'
import { useAuthStore } from '../../../src/stores/auth.store'

const { mockAuthApi, mockBackupApi } = vi.hoisted(() => ({
  mockAuthApi: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    getAuditLog: vi.fn(),
  },
  mockBackupApi: {
    download: vi.fn(),
    restore: vi.fn(),
  },
}))

vi.mock('../../../src/api/auth.api', () => ({ authApi: mockAuthApi }))
vi.mock('../../../src/api/backup.api', () => ({ backupApi: mockBackupApi }))

const fakeUser = {
  id: 'u1',
  email: 'alice@example.com',
  username: 'alice',
  firstName: 'Alice',
  lastName: 'Smith',
  phone: '+1 555 000 0001',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/profile', component: ProfileView },
      { path: '/:pathMatch(.*)*', redirect: '/profile' },
    ],
  })
}

let pinia: ReturnType<typeof createPinia>
let currentWrapper: ReturnType<typeof mount> | null = null

beforeEach(() => {
  pinia = createPinia()
  setActivePinia(pinia)
  vi.clearAllMocks()
  mockAuthApi.me.mockResolvedValue(fakeUser)
})

afterEach(() => {
  currentWrapper?.unmount()
  currentWrapper = null
})

function mountProfile() {
  const router = makeRouter()
  const wrapper = mount(ProfileView, {
    global: { plugins: [pinia, router] },
  })
  currentWrapper = wrapper
  return { wrapper, router }
}

function seedUser() {
  const auth = useAuthStore()
  auth.user = { ...fakeUser }
  return auth
}

describe('ProfileView', () => {
  describe('Personal details section', () => {
    it('renders the Profile heading', () => {
      seedUser()
      const { wrapper } = mountProfile()
      expect(wrapper.text()).toContain('Profile')
    })

    it('pre-fills firstName and lastName from auth store', () => {
      seedUser()
      const { wrapper } = mountProfile()
      const inputs = wrapper.findAll('input[type="text"]')
      // firstName is first, lastName is second
      expect((inputs[0].element as HTMLInputElement).value).toBe('Alice')
      expect((inputs[1].element as HTMLInputElement).value).toBe('Smith')
    })

    it('pre-fills phone from auth store', () => {
      seedUser()
      const { wrapper } = mountProfile()
      const tel = wrapper.find('input[type="tel"]')
      expect((tel.element as HTMLInputElement).value).toBe('+1 555 000 0001')
    })

    it('shows email as editable and username as disabled', () => {
      seedUser()
      const { wrapper } = mountProfile()
      const emailInput = wrapper.find('input[type="email"]')
      const usernameInputs = wrapper.findAll('input[type="text"]')
      // Email is now editable
      expect(emailInput.attributes('disabled')).toBeUndefined()
      // Username (third text input, index 2) remains disabled
      expect(usernameInputs[2].attributes('disabled')).toBeDefined()
    })

    it('calls updateProfile and shows success alert on submit', async () => {
      const auth = seedUser()
      mockAuthApi.updateProfile.mockResolvedValue({ ...fakeUser, firstName: 'Bob' })
      mockAuthApi.me.mockResolvedValue({ ...fakeUser, firstName: 'Bob' })
      const { wrapper } = mountProfile()

      const firstNameInput = wrapper.findAll('input[type="text"]')[0]
      await firstNameInput.setValue('Bob')

      const profileForm = wrapper.find('form')
      await profileForm.trigger('submit')
      await flushPromises()

      expect(mockAuthApi.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ firstName: 'Bob' })
      )
      expect(wrapper.text()).toContain('Profile updated')
      expect(auth.user?.firstName).toBe('Bob')
    })

    it('shows error alert when updateProfile fails', async () => {
      seedUser()
      mockAuthApi.updateProfile.mockRejectedValue(new Error('Network error'))
      const { wrapper } = mountProfile()

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.text()).toContain('Failed to save profile')
    })

    it('disables Save button while saving', async () => {
      seedUser()
      let resolve!: (v: unknown) => void
      mockAuthApi.updateProfile.mockReturnValue(new Promise((r) => (resolve = r)))
      const { wrapper } = mountProfile()

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      const saveBtn = wrapper.find('button[type="submit"]')
      expect(saveBtn.attributes('disabled')).toBeDefined()
      expect(wrapper.text()).toContain('Saving')

      resolve({ ...fakeUser })
      await flushPromises()
    })
  })

  describe('Change password section', () => {
    it('renders current, new, confirm password inputs', () => {
      seedUser()
      const { wrapper } = mountProfile()
      const passwordInputs = wrapper.findAll('input[type="password"]')
      expect(passwordInputs.length).toBe(3)
    })

    it('shows error when new passwords do not match', async () => {
      seedUser()
      const { wrapper } = mountProfile()
      const passwordInputs = wrapper.findAll('input[type="password"]')

      await passwordInputs[0].setValue('CurrentPass123')
      await passwordInputs[1].setValue('NewPass456!')
      await passwordInputs[2].setValue('DifferentPass!')

      const forms = wrapper.findAll('form')
      await forms[1].trigger('submit')
      await flushPromises()

      expect(wrapper.text()).toContain('do not match')
      expect(mockAuthApi.changePassword).not.toHaveBeenCalled()
    })

    it('shows error when new password is too short', async () => {
      seedUser()
      const { wrapper } = mountProfile()
      const passwordInputs = wrapper.findAll('input[type="password"]')

      await passwordInputs[0].setValue('CurrentPass123')
      await passwordInputs[1].setValue('short')
      await passwordInputs[2].setValue('short')

      const forms = wrapper.findAll('form')
      await forms[1].trigger('submit')
      await flushPromises()

      expect(wrapper.text()).toContain('at least 8 characters')
      expect(mockAuthApi.changePassword).not.toHaveBeenCalled()
    })

    it('calls changePassword and clears form on success', async () => {
      seedUser()
      mockAuthApi.changePassword.mockResolvedValue(undefined)
      const { wrapper } = mountProfile()
      const passwordInputs = wrapper.findAll('input[type="password"]')

      await passwordInputs[0].setValue('CurrentPass123')
      await passwordInputs[1].setValue('NewPass456!')
      await passwordInputs[2].setValue('NewPass456!')

      const forms = wrapper.findAll('form')
      await forms[1].trigger('submit')
      await flushPromises()

      expect(mockAuthApi.changePassword).toHaveBeenCalledWith({
        oldPassword: 'CurrentPass123',
        newPassword: 'NewPass456!',
      })
      expect(wrapper.text()).toContain('Password changed')
      // Fields should be cleared
      expect((passwordInputs[0].element as HTMLInputElement).value).toBe('')
    })

    it('shows "Current password is incorrect" for 401 response', async () => {
      seedUser()
      const err = Object.assign(new Error('Unauthorized'), { response: { status: 401 } })
      mockAuthApi.changePassword.mockRejectedValue(err)
      const { wrapper } = mountProfile()
      const passwordInputs = wrapper.findAll('input[type="password"]')

      await passwordInputs[0].setValue('WrongPass123')
      await passwordInputs[1].setValue('NewPass456!')
      await passwordInputs[2].setValue('NewPass456!')

      const forms = wrapper.findAll('form')
      await forms[1].trigger('submit')
      await flushPromises()

      expect(wrapper.text()).toContain('Current password is incorrect')
    })

    it('shows generic error for non-401 failures', async () => {
      seedUser()
      mockAuthApi.changePassword.mockRejectedValue(new Error('Server error'))
      const { wrapper } = mountProfile()
      const passwordInputs = wrapper.findAll('input[type="password"]')

      await passwordInputs[0].setValue('CurrentPass123')
      await passwordInputs[1].setValue('NewPass456!')
      await passwordInputs[2].setValue('NewPass456!')

      const forms = wrapper.findAll('form')
      await forms[1].trigger('submit')
      await flushPromises()

      expect(wrapper.text()).toContain('Failed to change password')
    })

    it('disables Change Password button while saving', async () => {
      seedUser()
      let resolve!: (v: unknown) => void
      mockAuthApi.changePassword.mockReturnValue(new Promise((r) => (resolve = r)))
      const { wrapper } = mountProfile()
      const passwordInputs = wrapper.findAll('input[type="password"]')

      await passwordInputs[0].setValue('CurrentPass123')
      await passwordInputs[1].setValue('NewPass456!')
      await passwordInputs[2].setValue('NewPass456!')

      const forms = wrapper.findAll('form')
      await forms[1].trigger('submit')
      await flushPromises()

      const btns = wrapper.findAll('button[type="submit"]')
      expect(btns[1].attributes('disabled')).toBeDefined()

      resolve(undefined)
      await flushPromises()
    })
  })

  describe('Backup & Restore section', () => {
    it('calls backupApi.download when Download backup button is clicked', async () => {
      seedUser()
      mockBackupApi.download.mockResolvedValue(undefined)
      const { wrapper } = mountProfile()

      const downloadBtn = wrapper.find('button.btn-secondary')
      await downloadBtn.trigger('click')
      await flushPromises()

      expect(mockBackupApi.download).toHaveBeenCalled()
    })

    it('shows error when backupApi.download fails', async () => {
      seedUser()
      mockBackupApi.download.mockRejectedValue(new Error('Network failure'))
      const { wrapper } = mountProfile()

      const downloadBtn = wrapper.find('button.btn-secondary')
      await downloadBtn.trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('Failed to download backup')
    })

    // Helper: create a fake file-like object whose .text() returns a resolved promise.
    // We use a plain object because JSDOM's File does not implement Blob.text().
    function fakeFileWith(content: string) {
      return { text: vi.fn().mockResolvedValue(content), name: 'backup.json', value: '' }
    }

    it('restores from file and shows success message', async () => {
      seedUser()
      const restoreResult = { lists: 2, items: 5 }
      mockBackupApi.restore.mockResolvedValue(restoreResult)
      const { wrapper } = mountProfile()

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
      seedUser()
      const err = { response: { data: { message: 'Invalid backup format' } } }
      mockBackupApi.restore.mockRejectedValue(err)
      const { wrapper } = mountProfile()

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
      seedUser()
      mockBackupApi.restore.mockRejectedValue(new Error('Unknown error'))
      const { wrapper } = mountProfile()

      const fakeFile = fakeFileWith('{}')
      const event = { target: { files: [fakeFile], value: '' } }
      await (
        wrapper.vm as unknown as { handleRestoreFile: (e: Event) => Promise<void> }
      ).handleRestoreFile(event as unknown as Event)
      await flushPromises()

      expect(wrapper.text()).toContain('Failed to restore backup')
    })

    it('does nothing when no file is selected (handleRestoreFile early return)', async () => {
      seedUser()
      const { wrapper } = mountProfile()

      const event = { target: { files: [], value: '' } }
      await (
        wrapper.vm as unknown as { handleRestoreFile: (e: Event) => Promise<void> }
      ).handleRestoreFile(event as unknown as Event)
      await flushPromises()

      expect(mockBackupApi.restore).not.toHaveBeenCalled()
    })
  })
})
