/** Настройки Jest: unit-тесты и интеграционные тесты с отдельной MongoDB */
module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  transform: {
    // 151002 - предупреждение ts-jest о module "nodenext" без isolatedModules: на результат тестов не влияет
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.spec.json', diagnostics: { ignoreCodes: [151002] } }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['<rootDir>/test/**/*.spec.ts'],
  // Перед каждым файлом тестов подставляем тестовую базу вместо рабочей
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  testTimeout: 60000,
};
