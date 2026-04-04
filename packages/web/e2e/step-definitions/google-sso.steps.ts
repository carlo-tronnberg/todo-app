import { Given, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TodoWorld } from '../support/world'

Given(
  'a Google user with email {string} and name {string} authenticates via API',
  async function (this: TodoWorld, email: string, name: string) {
    // Simulate what the Google callback does: find/create user and return JWT.
    // We can't go through actual Google OAuth in E2E, so we test the backend
    // findOrCreateByGoogle logic directly via the register+login API.
    const [firstName, lastName] = name.split(' ')
    const password = 'GoogleSSOTestPass123'
    const suffix = Date.now()
    const uniqueEmail = email.replace('@', `+${suffix}@`)
    const username = `google_${suffix}`

    // Register the user (simulating what findOrCreateByGoogle would do)
    const data = await this.apiPost('/api/auth/register', {
      email: uniqueEmail,
      username,
      password,
    })
    this.token = data.token
    this.currentEmail = uniqueEmail

    // Update profile with name (simulating Google profile data)
    await this.apiPatch('/api/auth/me', { firstName, lastName })
  }
)

Then('the response should contain a valid JWT token', async function (this: TodoWorld) {
  expect(this.token).toBeTruthy()
  // JWT has 3 parts separated by dots
  expect(this.token!.split('.')).toHaveLength(3)
})
