import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorExample, ApiErrors, ApiSuccess, EXAMPLES } from '../common/swagger';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { ObjectIdPipe } from '../common/object-id.pipe';
import { CategoriesService } from './categories.service';
import { CategoryListQueryDto } from './dto/category-list-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@ApiTags('Категории')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // GET /api/v1/categories - справочник для любого вошедшего пользователя
  @ApiOperation({ summary: 'Справочник категорий (любой вошедший)' })
  @ApiSuccess(200, 'Страница категорий', EXAMPLES.page(EXAMPLES.category))
  @ApiErrors(400, 401)
  @Get()
  list(@Query() query: CategoryListQueryDto) {
    return this.categoriesService.list(query);
  }

  // POST /api/v1/categories - создание категории преподавателем
  @ApiOperation({ summary: 'Создать категорию (преподаватель)' })
  @ApiSuccess(201, 'Категория создана', EXAMPLES.category)
  @ApiErrors(400, 401, 403)
  @ApiErrorExample(409, 'Такое имя уже есть у этого родителя', { code: 'CATEGORY_EXISTS', message: 'Категория с таким названием уже есть в этом разделе', fields: { name: 'Категория с таким названием уже есть в этом разделе' } })
  @Post()
  @Roles('teacher')
  @HttpCode(201)
  create(@Body() dto: CreateCategoryDto, @CurrentUser() user: AuthUser) {
    return this.categoriesService.create(dto, user);
  }

  // POST /api/v1/categories/:id/archive - архивирование пустой категории ее автором
  @ApiOperation({ summary: 'Архивировать свою категорию без курсов и действующих подкатегорий' })
  @ApiSuccess(200, 'Категория в архиве', { ...EXAMPLES.category, archived: true })
  @ApiErrors(400, 401, 403, 404)
  @ApiErrorExample(409, 'В категории есть курсы или подкатегории, либо она уже в архиве', { code: 'CATEGORY_IN_USE', message: 'В категории есть курсы, поэтому ее нельзя архивировать' })
  @Post(':id/archive')
  @Roles('teacher')
  @HttpCode(200)
  archive(@Param('id', ObjectIdPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.categoriesService.archive(id, user);
  }

  // DELETE /api/v1/categories/:id - удаление категории, которая ни с чем не связана
  @ApiOperation({ summary: 'Удалить свою категорию, с которой ничего не связано' })
  @ApiSuccess(204, 'Удалено')
  @ApiErrors(400, 401, 403, 404)
  @ApiErrorExample(409, 'Категория связана с курсами или подкатегориями - используйте архив', { code: 'CATEGORY_IN_USE', message: 'К категории привязаны курсы, удалить ее нельзя. Используйте архив' })
  @Delete(':id')
  @Roles('teacher')
  @HttpCode(204)
  async remove(@Param('id', ObjectIdPipe) id: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.categoriesService.remove(id, user);
  }
}
