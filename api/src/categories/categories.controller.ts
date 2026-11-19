import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { ObjectIdPipe } from '../common/object-id.pipe';
import { CategoriesService } from './categories.service';
import { CategoryListQueryDto } from './dto/category-list-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // GET /api/v1/categories - справочник для любого вошедшего пользователя
  @Get()
  list(@Query() query: CategoryListQueryDto) {
    return this.categoriesService.list(query);
  }

  // POST /api/v1/categories - создание категории преподавателем
  @Post()
  @Roles('teacher')
  @HttpCode(201)
  create(@Body() dto: CreateCategoryDto, @CurrentUser() user: AuthUser) {
    return this.categoriesService.create(dto, user);
  }

  // POST /api/v1/categories/:id/archive - архивирование пустой категории ее автором
  @Post(':id/archive')
  @Roles('teacher')
  @HttpCode(200)
  archive(@Param('id', ObjectIdPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.categoriesService.archive(id, user);
  }

  // DELETE /api/v1/categories/:id - удаление категории, которая ни с чем не связана
  @Delete(':id')
  @Roles('teacher')
  @HttpCode(204)
  async remove(@Param('id', ObjectIdPipe) id: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.categoriesService.remove(id, user);
  }
}
