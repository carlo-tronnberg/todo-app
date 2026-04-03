import { beforeAll, afterAll } from 'vitest'

// Load .env so TEST_DATABASE_URL etc. are available (Node 20.12+ built-in)
try {
  process.loadEnvFile()
} catch {
  /* ignore if .env is absent */
}

// Set test environment variables before anything imports the DB
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://todo_user:todo_pass@localhost:5435/todo_test'
process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough'

// Global test lifecycle hooks can go here if needed
beforeAll(async () => {
  // Any global setup
})

afterAll(async () => {
  // Any global teardown
})
