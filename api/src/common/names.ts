import { Model } from 'mongoose';

// Загружает подписи связанных объектов ОДНИМ запросом на весь список,
// чтобы карточки показывали названия, а не ObjectId (и без запроса на каждую строку)
export async function loadNames<T>(model: Model<T>, ids: unknown[], field: string): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (unique.length === 0) return new Map();

  const docs = await model
    .find({ _id: { $in: unique } })
    .select(field)
    .lean<Array<Record<string, unknown>>>();

  return new Map(docs.map((doc) => [String(doc._id), String(doc[field] ?? '')]));
}
