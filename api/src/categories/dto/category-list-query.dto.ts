import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PageQueryDto } from '../../common/pagination';

export class CategoryListQueryDto extends PageQueryDto {
  // По умолчанию архивные категории не показываются
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean({ message: 'includeArchived: true или false' })
  includeArchived?: boolean;
}
