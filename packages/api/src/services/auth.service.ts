import { and, eq, ne } from 'drizzle-orm'
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

export interface UpdateProfileInput {
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  phone?: string | null
}

export class AuthService {
  constructor(private db: Database) {}

  async register(input: RegisterInput) {
    const existing = await this.db.select().from(users).where(eq(users.email, input.email)).limit(1)

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
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    /* c8 ignore next */
    return user ?? null
  }

  async updateProfile(id: string, input: UpdateProfileInput) {
    if (input.email) {
      const [conflict] = await this.db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, input.email), ne(users.id, id)))
        .limit(1)
      if (conflict) throw new Error('EMAIL_IN_USE')
    }

    const [updated] = await this.db
      .update(users)
      .set({
        ...(input.email ? { email: input.email } : {}),
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        phone: input.phone ?? null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        createdAt: users.createdAt,
      })

    /* c8 ignore next */
    return updated ?? null
  }

  async changePassword(id: string, oldPassword: string, newPassword: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1)
    /* c8 ignore next */
    if (!user) throw new Error('USER_NOT_FOUND')

    const valid = await verifyPassword(oldPassword, user.passwordHash)
    if (!valid) throw new Error('WRONG_PASSWORD')

    const newHash = await hashPassword(newPassword)
    await this.db
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(users.id, id))
  }
}
