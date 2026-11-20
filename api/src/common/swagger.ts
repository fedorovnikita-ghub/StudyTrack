import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

// Помощники OpenAPI: единый формат ошибки и примеры ответов без повторения в каждом контроллере

interface ErrorExample {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

const STANDARD: Record<number, { description: string } & ErrorExample> = {
  400: {
    description: 'Неверный формат, ошибка валидации или лишнее поле',
    code: 'VALIDATION_ERROR',
    message: 'Проверьте правильность заполнения полей',
    fields: { title: 'Название от 3 до 120 символов' },
  },
  401: { description: 'Нет входа, токен истек или аккаунт отключен', code: 'UNAUTHORIZED', message: 'Требуется вход в систему' },
  403: { description: 'Действие запрещено для роли', code: 'FORBIDDEN', message: 'Недостаточно прав для этого действия' },
  404: { description: 'Объекта нет или он чужой', code: 'NOT_FOUND', message: 'Объект не найден' },
  409: { description: 'Конфликт состояния, уникальности или версии', code: 'CONFLICT', message: 'Конфликт данных' },
  503: {
    description: 'Временно недоступна база или сервис',
    code: 'SERVICE_UNAVAILABLE',
    message: 'Сервис временно недоступен. Повторите позже',
  },
};

export function errorSchema(example: ErrorExample) {
  return {
    type: 'object',
    required: ['error'],
    properties: {
      error: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: { type: 'string', description: 'Машинный код ошибки' },
          message: { type: 'string', description: 'Сообщение для пользователя' },
          fields: {
            type: 'object',
            additionalProperties: { type: 'string' },
            description: 'Ошибки по полям формы (только для ошибок формы)',
          },
        },
      },
    },
    example: { error: example },
  };
}

// Стандартные ошибки маршрута: @ApiErrors(400, 401, 404)
export function ApiErrors(...statuses: number[]) {
  return applyDecorators(
    ...statuses.map((status) => {
      const { description, ...example } = STANDARD[status];
      return ApiResponse({ status, description, schema: errorSchema(example) });
    }),
  );
}

// Конкретная ошибка с точным кодом и сообщением
export function ApiErrorExample(status: number, description: string, example: ErrorExample) {
  return ApiResponse({ status, description, schema: errorSchema(example) });
}

// Успешный ответ с примером JSON
export function ApiSuccess(status: 200 | 201 | 204, description: string, example?: unknown) {
  return ApiResponse({ status, description, ...(example === undefined ? {} : { schema: { type: 'object', example } }) });
}

// ---------- Примеры ответов ----------

const id = (n: number) => `6740a1b2c3d4e5f6a7b8c9${String(n).padStart(2, '0')}`;

export const EXAMPLES = {
  user: { id: id(1), displayName: 'Айгерим Сапарова', email: 'aigerim@studytrack.demo', role: 'student' },
  session: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    expiresAt: '2026-11-20T07:00:00.000Z',
    user: { id: id(1), displayName: 'Айгерим Сапарова', email: 'aigerim@studytrack.demo', role: 'student' },
  },
  category: {
    id: id(2),
    name: 'Веб-разработка',
    parentId: id(3),
    archived: false,
    coursesCount: 1,
    childrenCount: 0,
    createdBy: id(4),
  },
  course: {
    id: id(5),
    title: 'Веб-программирование на JS',
    description: 'Node.js, NestJS, MongoDB и Next.js',
    status: 'active',
    version: 1,
    category: { id: id(2), name: 'Веб-разработка' },
    teacher: { id: id(4), displayName: 'Анна Смирнова' },
    createdAt: '2026-11-01T05:00:00.000Z',
    updatedAt: '2026-11-01T05:00:00.000Z',
  },
  enrollment: {
    id: id(6),
    courseId: id(5),
    student: { id: id(1), displayName: 'Айгерим Сапарова', email: 'aigerim@studytrack.demo' },
    status: 'active',
    createdAt: '2026-11-02T05:00:00.000Z',
    removedAt: null,
    removeReason: '',
  },
  assignment: {
    id: id(7),
    courseId: id(5),
    title: 'Лабораторная 1: HTTP и REST',
    text: 'Опишите три маршрута вашего API и коды ответов.',
    dueAt: '2026-11-25T18:59:00.000Z',
    maxScore: 100,
    settings: { maxVersions: 20, minTextLength: 1 },
    status: 'published',
    isOverdue: false,
    createdAt: '2026-11-10T05:00:00.000Z',
  },
  submission: {
    id: id(8),
    assignmentId: id(7),
    courseId: id(5),
    student: { id: id(1), displayName: 'Айгерим Сапарова' },
    number: 2,
    textPreview: 'Маршруты: GET /courses, POST /courses ...',
    submittedAt: '2026-11-20T06:30:00.000Z',
    isLate: false,
    status: 'submitted',
    currentGrade: null,
    version: 1,
  },
  page: <T>(item: T) => ({ items: [item], page: 1, limit: 20, total: 1 }),
};
