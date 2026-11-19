// Защищенная команда: создает пользователя с нужной ролью (обычно преподавателя).
// Запускается только тем, у кого есть доступ к серверу и .env. Через сайт так сделать нельзя.
//
//   npm run user:create
//
// Команда по очереди спрашивает email, имя, роль и пароль. В bash можно передать данные флагами:
//   npm run user:create -- --email teacher@example.com --name "Иван Петров" --role teacher
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import mongoose from 'mongoose';
import { hashPassword } from '../auth/password';
import { LIMITS } from '../common/limits';
import { isDuplicateKeyError } from '../common/mongo-errors';
import { config } from '../config';
import { USER_MODEL, USER_ROLES, UserRole, UserSchema } from '../models';

async function main() {
  // PowerShell может "съесть" флаги, поэтому лишние аргументы не считаем ошибкой: недостающее спросим
  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      name: { type: 'string' },
      role: { type: 'string' },
    },
    strict: false,
    allowPositionals: true,
  });

  const rl = createInterface({ input: stdin, output: stdout });
  const ask = async (question: string, preset: unknown) =>
    typeof preset === 'string' && preset.trim() ? preset.trim() : (await rl.question(question)).trim();

  let email: string;
  let displayName: string;
  let roleInput: string;
  let password: string;
  try {
    email = (await ask('Email: ', values.email)).toLowerCase();
    displayName = await ask('Имя: ', values.name);
    roleInput = (await ask(`Роль (${USER_ROLES.join(' / ')}) [teacher]: `, values.role)) || 'teacher';
    password = await rl.question(`Пароль (не короче ${LIMITS.password.min} символов): `);
  } finally {
    rl.close();
  }

  if (!email || !email.includes('@')) {
    throw new Error('Неверный email');
  }
  if (displayName.length < LIMITS.displayName.min || displayName.length > LIMITS.displayName.max) {
    throw new Error(`Имя от ${LIMITS.displayName.min} до ${LIMITS.displayName.max} символов`);
  }
  if (!USER_ROLES.includes(roleInput as UserRole)) {
    throw new Error(`Роль должна быть одной из: ${USER_ROLES.join(', ')}`);
  }
  if (password.length < LIMITS.password.min) {
    throw new Error(`Пароль не короче ${LIMITS.password.min} символов`);
  }
  if (Buffer.byteLength(password, 'utf8') > LIMITS.password.maxBytes) {
    throw new Error('Пароль слишком длинный');
  }

  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 10_000 });
  try {
    const Users = mongoose.model(USER_MODEL, UserSchema);
    const user = await Users.create({
      email,
      displayName,
      role: roleInput as UserRole,
      passwordHash: await hashPassword(password),
    });
    console.log(`Создан пользователь ${user.email} с ролью ${user.role}`);
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new Error(`Пользователь ${email} уже существует`);
    }
    throw err;
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(`Ошибка: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
