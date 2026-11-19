/** Настройки Jest: unit-тесты и интеграционные тесты с отдельной MongoDB */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['<rootDir>/test/**/*.spec.ts'],
  // Перед каждым файлом тестов подставляем тестовую базу вместо рабочей
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  testTimeout: 60000,
};
