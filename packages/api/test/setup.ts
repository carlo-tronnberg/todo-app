import { beforeAll, afterAll } from 'vitest'

// Set test environment variables before anything imports the DB
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://todo_user:todo_pass@localhost:5432/todo_test'
process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough'

// Global test lifecycle hooks can go here if needed
beforeAll(async () => {
  // Any global setup
})

afterAll(async () => {
  // Any global teardown
})
