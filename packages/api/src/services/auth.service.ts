import { eq } from 'drizzle-orm'
import { Database, users } from '../db'
import { hashPassword, verifyPassword } from '../utils/hash'

export interface RegisterInput {
  email: string
  username: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

export class AuthService {
  constructor(private db: Database) {}

  async register(input: RegisterInput) {
    const existing = await this.db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1)

    if (existing.length > 0) {
      throw new Error('EMAIL_TAKEN')
    }

    const existingUsername = await this.db
      .select()
      .from(users)
      .where(eq(users.username, input.username))
      .limit(1)

    if (existingUsername.length > 0) {
      throw new Error('USERNAME_TAKEN')
    }

    const passwordHash = await hashPassword(input.password)

    const [user] = await this.db
      .insert(users)
      .values({
        email: input.email,
        username: input.username,
        passwordHash,
      })
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        createdAt: users.createdAt,
      })

    return user
  }

  async login(input: LoginInput) {
    const [user] = await this.db.select().from(users).where(eq(users.email, input.email)).limit(1)

    if (!user) throw new Error('INVALID_CREDENTIALS')

    const valid = await verifyPassword(input.password, user.passwordHash)
    if (!valid) throw new Error('INVALID_CREDENTIALS')

    return {
      id: user.id,
      email: user.email,
      username: user.username,
    }
  }

  async findById(id: string) {
    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    return user ?? null
  }
}
