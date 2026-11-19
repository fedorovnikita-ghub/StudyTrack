// Проверка "целое число" для числовых полей схем
export const integerValidator = {
  validator: (value: number) => Number.isInteger(value),
  message: 'Значение должно быть целым числом',
};
