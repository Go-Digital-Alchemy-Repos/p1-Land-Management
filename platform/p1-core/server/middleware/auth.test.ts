import { beforeEach, describe, it, expect, vi } from "vitest";
import {
  authenticateToken,
  comparePassword,
  generateToken,
  hashPassword,
  optionalAuth,
  requireRole,
} from "./auth";
import type { Request, Response, NextFunction } from "express";
import type { User } from "@shared/schema";

const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
}));

vi.mock("../storage/index", () => ({
  storage: {
    users: {
      getUser: mockGetUser,
    },
  },
}));

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "usr_1",
    email: "test@example.com",
    password: "hashed",
    firstName: "Test",
    lastName: "User",
    role: "therapist",
    profileImageUrl: null,
    isSuspended: false,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

describe("hashPassword / comparePassword", () => {
  it("round-trips a password correctly", async () => {
    const plain = "SuperSecret123!";
    const hash = await hashPassword(plain);
    expect(hash).not.toBe(plain);
    expect(await comparePassword(plain, hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct");
    expect(await comparePassword("wrong", hash)).toBe(false);
  });
});

describe("generateToken", () => {
  it("returns a JWT string with three dot-separated parts", () => {
    const user = makeUser();
    const token = generateToken(user);
    expect(typeof token).toBe("string");
    const parts = token.split(".");
    expect(parts).toHaveLength(3);
  });

  it("encodes the correct payload (userId, email, role)", () => {
    const user = makeUser({ id: "u42", email: "a@b.com", role: "admin" });
    const token = generateToken(user);
    const payloadB64 = token.split(".")[1];
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    expect(payload.userId).toBe("u42");
    expect(payload.email).toBe("a@b.com");
    expect(payload.role).toBe("admin");
    expect(payload.sessionVersion).toEqual(expect.any(String));
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});

describe("session invalidation", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
  });

  function mockReqRes(token: string) {
    const req = { cookies: { p1_admin_token: token } } as unknown as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;
    return { req, res, next };
  }

  it("accepts a token while the account and password are unchanged", async () => {
    const user = makeUser({ password: "current-hash" });
    mockGetUser.mockResolvedValue(user);
    const { req, res, next } = mockReqRes(generateToken(user));

    await authenticateToken(req, res, next);

    expect(req.user).toEqual(user);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rejects an existing token after the password hash changes", async () => {
    const originalUser = makeUser({ password: "original-hash" });
    mockGetUser.mockResolvedValue(makeUser({ password: "replacement-hash" }));
    const { req, res, next } = mockReqRes(generateToken(originalUser));

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects an existing token after the account is suspended", async () => {
    const user = makeUser({ password: "current-hash" });
    mockGetUser.mockResolvedValue({ ...user, isSuspended: true });
    const { req, res, next } = mockReqRes(generateToken(user));

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("does not attach a suspended identity during optional authentication", async () => {
    const user = makeUser({ password: "current-hash" });
    mockGetUser.mockResolvedValue({ ...user, isSuspended: true });
    const { req, res, next } = mockReqRes(generateToken(user));

    await optionalAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });
});

describe("requireRole", () => {
  function mockReqRes(user?: User) {
    const req = { user } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const next = vi.fn() as NextFunction;
    return { req, res, next };
  }

  it("returns 401 when no user is attached", () => {
    const { req, res, next } = mockReqRes();
    requireRole("admin")(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when user role is not allowed", () => {
    const { req, res, next } = mockReqRes(makeUser({ role: "therapist" }));
    requireRole("admin")(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when user role matches", () => {
    const { req, res, next } = mockReqRes(makeUser({ role: "admin" }));
    requireRole("admin", "therapist")(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
