import { eq, and, isNull, gt } from "drizzle-orm";
import { db } from "../db";
import { passwordResetTokens, type PasswordResetToken } from "@shared/schema";
import crypto from "crypto";

export class PasswordResetStorage {
  generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  async createToken(userId: string): Promise<PasswordResetToken> {
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const [record] = await db
      .insert(passwordResetTokens)
      .values({ userId, token, expiresAt })
      .returning();
    return record;
  }

  async getValidToken(token: string): Promise<PasswordResetToken | undefined> {
    const [record] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      );
    return record;
  }

  async markUsed(id: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, id));
  }
}
