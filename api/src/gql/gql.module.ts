import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import type { GraphQLFormattedError } from 'graphql';
import { join } from 'node:path';
import { AssignmentsModule } from '../assignments/assignments.module';
import { CoursesModule } from '../courses/courses.module';
import { SubmissionsModule } from '../submissions/submissions.module';
import { queryLimits } from './query-limits';
import { StudyResolver } from './study.resolver';

// Наши ошибки (из фильтра) и ошибки валидации GraphQL уже безопасны. Прочие - без подробностей
function formatError(error: GraphQLFormattedError): GraphQLFormattedError {
  const extensions = error.extensions ?? {};
  const code = typeof extensions.code === 'string' ? extensions.code : 'INTERNAL_ERROR';
  const message = code === 'INTERNAL_SERVER_ERROR' || code === 'INTERNAL_ERROR' ? 'Внутренняя ошибка сервера' : error.message;
  return {
    message,
    locations: error.locations,
    path: error.path,
    extensions: { code, status: extensions.status, fields: extensions.fields },
  };
}

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      path: '/graphql',
      // Схема строится из кода и сохраняется в файл для документации
      autoSchemaFile: join(process.cwd(), 'schema.gql'),
      sortSchema: true,
      context: ({ req }: { req: unknown }) => ({ req }),
      // Guard-ы и фильтр ошибок работают и для полей (ResolveField), не только для Query
      fieldResolverEnhancers: ['guards', 'filters'],
      validationRules: [queryLimits({ maxDepth: 5, maxFields: 60 })],
      includeStacktraceInErrorResponses: false,
      formatError,
      playground: false,
      graphiql: process.env.NODE_ENV !== 'production',
    }),
    CoursesModule,
    AssignmentsModule,
    SubmissionsModule,
  ],
  providers: [StudyResolver],
})
export class GqlModule {}
