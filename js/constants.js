export const SIG = Object.freeze({
  NONE: 0,
  DATA: 1,
  WEAK: 2,
  STRONG: 3
});

export const DEFAULT_BRIDGE_DELAY = 10;
export const STRUCTURAL_DELAY = 2;
export const SABRUNE_DELAY = 5;
export const EFFECTOR_DELAY_FAST = 10;
export const EFFECTOR_DELAY_COMPLEX = 20;
export const CIRCLE_COMPLEX_DELAY = 3000;

export const CATEGORY_MAP = {
  source: 'Источники',
  structural: 'Структура и соединения',
  logic: 'Логика',
  control: 'Цензоры и реверс',
  modifier: 'Модификаторы',
  memory: 'Память и счётчики',
  circle: 'Круготечные',
  sensor: 'Детекторы',
  effect_meta: 'Мета-модификаторы',
  math: 'Математика',
  compare: 'Сравнение',
  string: 'Строки',
  values: 'Значения',
  effector_mono: 'Эффекторы — моноруны',
  effector_miro: 'Эффекторы — миротечные',
  effector_priamo: 'Эффекторы — прямотечные',
  effector_complex: 'Эффекторы — сложнотечные',
  effector_forbidden: 'Эффекторы — запретотечные'
};
