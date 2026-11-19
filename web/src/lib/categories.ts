import { Category } from './types';

// Полный путь категории: "Программирование / Веб"
export function categoryPath(category: Category, byId: Map<string, Category>): string {
  const names = [category.name];
  let parentId = category.parentId;
  let depth = 0;
  while (parentId && depth < 10) {
    const parent = byId.get(parentId);
    if (!parent) break;
    names.unshift(parent.name);
    parentId = parent.parentId;
    depth += 1;
  }
  return names.join(' / ');
}

export interface CategoryOption {
  id: string;
  label: string;
}

export function categoryOptions(categories: Category[]): CategoryOption[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  return categories
    .map((c) => ({ id: c.id, label: categoryPath(c, byId) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
}
