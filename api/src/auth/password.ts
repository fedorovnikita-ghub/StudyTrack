import { compare, hash, hashSync } from 'bcryptjs';

const BCRYPT_ROUNDS = 10;

// Хеш-пустышка: сравниваем с ним, если пользователь не найден,
// чтобы время ответа не выдавало, существует ли email
const DUMMY_HASH = hashSync('timing-protection-password', BCRYPT_ROUNDS);

export function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, passwordHash: string | undefined): Promise<boolean> {
  return compare(password, passwordHash ?? DUMMY_HASH);
}
