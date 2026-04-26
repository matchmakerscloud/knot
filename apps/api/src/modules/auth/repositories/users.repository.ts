import { eq, sql } from 'drizzle-orm';
import type { Database } from '../../../shared/db/client.js';
import { users, type User, type NewUser } from '../../../shared/db/schema/users.js';

export type CreateUserInput = Pick<
  NewUser,
  'email' | 'phone' | 'passwordHash' | 'firstName' | 'dateOfBirth' | 'gender' | 'genderOtherLabel' | 'locale'
>;

export class UsersRepository {
  constructor(private readonly db: Database) {}

  async create(input: CreateUserInput): Promise<User> {
    const [row] = await this.db
      .insert(users)
      .values({ ...input, email: input.email.toLowerCase() })
      .returning();
    if (!row) throw new Error('users.insert.no_row_returned');
    return row;
  }

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(sql`lower(${users.email})`, email.toLowerCase()))
      .limit(1);
    return row ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  }
}
