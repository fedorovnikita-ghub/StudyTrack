// Чтение действующих категорий двумя способами - Prisma и Mongoose - и сравнение результата.
// Пример ничего не пишет в базу: только findMany / find
import { existsSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import mongoose from 'mongoose';

if (existsSync('.env')) process.loadEnvFile('.env');
if (!process.env.MONGODB_URI) {
  console.error('Задайте MONGODB_URI в scripts/prisma-read/.env');
  process.exit(1);
}

const LIMIT = 20;

async function readWithPrisma() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.category.findMany({
      where: { archived: false },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: LIMIT,
      select: { id: true, name: true, parentId: true, coursesCount: true },
    });
    // id и parentId уже строки
    return rows.map((r) => ({ id: r.id, name: r.name, parentId: r.parentId, coursesCount: r.coursesCount }));
  } finally {
    await prisma.$disconnect();
  }
}

async function readWithMongoose() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  try {
    // Минимальная схема только для чтения. Третий аргумент - реальное имя коллекции
    const Category = mongoose.model(
      'CategoryRead',
      new mongoose.Schema({ name: String, parentId: mongoose.Schema.Types.ObjectId, archived: Boolean, coursesCount: Number }),
      'categories',
    );
    const rows = await Category.find({ archived: false })
      .sort({ name: 1, _id: 1 })
      .limit(LIMIT)
      .select('name parentId coursesCount')
      .lean();
    // _id и parentId - объекты ObjectId: приводим к строкам вручную
    return rows.map((r) => ({
      id: String(r._id),
      name: r.name,
      parentId: r.parentId ? String(r.parentId) : null,
      coursesCount: r.coursesCount,
    }));
  } finally {
    await mongoose.disconnect();
  }
}

const viaPrisma = await readWithPrisma();
const viaMongoose = await readWithMongoose();

console.log('\nPrisma:');
console.table(viaPrisma);
console.log('Mongoose:');
console.table(viaMongoose);

// Сортировка строк может отличаться для разных регистров/языков, поэтому сравниваем по id
const byId = (rows) => JSON.stringify([...rows].sort((a, b) => a.id.localeCompare(b.id)));
const same = byId(viaPrisma) === byId(viaMongoose);
console.log(same ? 'Результаты совпадают' : 'ВНИМАНИЕ: результаты различаются');
process.exitCode = same ? 0 : 1;
