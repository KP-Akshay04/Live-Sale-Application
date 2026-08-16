import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { JWTPayload } from '../types/auth.types.js';

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Hashes a plaintext password using bcrypt with standard salt rounds.
 * NEVER log plaintext passwords or hashes.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Password must be a valid non-empty string');
  }
  return bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
}

/**
 * Compares a candidate plaintext password with a stored bcrypt hash.
 * Timing-safe comparison handled by bcrypt.
 */
export async function comparePassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  if (!plainPassword || !hashedPassword) {
    return false;
  }
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Signs a minimal JSON Web Token (JWT) with configured secret and expiration.
 * Contains only minimal claims (no password, hashes, or secrets).
 */
export function signJwtToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiration as any,
  });
}

/**
 * Verifies and decodes a JWT string using the server JWT secret.
 * Throws JsonWebTokenError or TokenExpiredError on invalid tokens.
 */
export function verifyJwtToken(token: string): JWTPayload {
  const decoded = jwt.verify(token, env.jwtSecret);
  return decoded as JWTPayload;
}
