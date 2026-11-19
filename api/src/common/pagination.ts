import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { LIMITS } from './limits';

// Общие параметры страниц для всех списков: page=1, limit=20, максимум limit=100
export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Номер страницы должен быть целым числом' })
  @Min(1, { message: 'Номер страницы начинается с 1' })
  @Max(LIMITS.page.maxPage, { message: 'Слишком большой номер страницы' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Размер страницы должен быть целым числом' })
  @Min(1, { message: 'Размер страницы не меньше 1' })
  @Max(LIMITS.page.maxLimit, { message: `Размер страницы не больше ${LIMITS.page.maxLimit}` })
  limit: number = LIMITS.page.defaultLimit;
}

export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export function skipOf(query: PageQueryDto): number {
  return (query.page - 1) * query.limit;
}
