import { ArgsType, Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { IsInt, Max, Min } from 'class-validator';

// Типы GraphQL. Даты передаются строками ISO 8601 (UTC), как и в REST

@ObjectType('Person', { description: 'Пользователь в связях: только id и имя' })
export class PersonType {
  @Field(() => ID)
  id: string;

  @Field()
  displayName: string;
}

@ObjectType('CategoryRef')
export class CategoryRefType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;
}

@ObjectType('Course')
export class CourseType {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  description: string;

  @Field({ description: 'active или archived' })
  status: string;

  @Field(() => CategoryRefType)
  category: CategoryRefType;

  @Field(() => PersonType)
  teacher: PersonType;

  @Field({ description: 'ISO 8601, UTC' })
  createdAt: string;
}

@ObjectType('CoursePage')
export class CoursePageType {
  @Field(() => [CourseType])
  items: CourseType[];

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  total: number;
}

@ObjectType('CourseRef')
export class CourseRefType {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;
}

@ObjectType('SubmissionGrade')
export class SubmissionGradeType {
  @Field(() => Int)
  score: number;

  @Field({ description: 'ISO 8601, UTC' })
  gradedAt: string;
}

@ObjectType('Submission', { description: 'Версия работы' })
export class SubmissionType {
  @Field(() => ID)
  id: string;

  @Field(() => Int)
  number: number;

  @Field({ description: 'Первые 200 символов текста' })
  textPreview: string;

  @Field({ description: 'ISO 8601, UTC' })
  submittedAt: string;

  @Field()
  isLate: boolean;

  @Field({ description: 'submitted или graded' })
  status: string;

  @Field(() => PersonType)
  student: PersonType;

  @Field(() => SubmissionGradeType, { nullable: true })
  currentGrade: SubmissionGradeType | null;
}

@ObjectType('SubmissionPage')
export class SubmissionPageType {
  @Field(() => [SubmissionType])
  items: SubmissionType[];

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  total: number;
}

@ObjectType('Assignment')
export class AssignmentType {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  text: string;

  @Field({ description: 'Срок сдачи, ISO 8601, UTC' })
  dueAt: string;

  @Field(() => Int)
  maxScore: number;

  @Field()
  isOverdue: boolean;

  @Field({ description: 'Текущий пользователь - преподаватель этого курса' })
  isOwner: boolean;

  @Field(() => CourseRefType)
  course: CourseRefType;
}

// Предел записей на страницу в GraphQL меньше, чем в REST: запрос может тянуть вложенные списки
export const GQL_MAX_LIMIT = 20;

@ArgsType()
export class PageArgs {
  @Field(() => Int, { defaultValue: 1 })
  @IsInt({ message: 'page - целое число' })
  @Min(1, { message: 'page начинается с 1' })
  @Max(10000, { message: 'Слишком большой номер страницы' })
  page: number = 1;

  @Field(() => Int, { defaultValue: 10 })
  @IsInt({ message: 'limit - целое число' })
  @Min(1, { message: 'limit не меньше 1' })
  @Max(GQL_MAX_LIMIT, { message: `limit не больше ${GQL_MAX_LIMIT}` })
  limit: number = 10;
}
