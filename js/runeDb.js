import {
  STRUCTURAL_DELAY,
  SABRUNE_DELAY,
  EFFECTOR_DELAY_FAST,
  EFFECTOR_DELAY_COMPLEX,
  CIRCLE_COMPLEX_DELAY,
  CATEGORY_MAP
} from './constants.js';

export { CATEGORY_MAP };

export const RUNE_DB = {
  source_strong: {
    label: 'Магоисточник',
    color: '#ef4444',
    family: 'source',
    type: 'source_strong',
    inputs: 0,
    outputs: 1,
    delay: 0,
    desc: 'Источник сильного магосигнала уровня 3'
  },
  source_weak: {
    label: 'Слабый магоисточник',
    color: '#a78bfa',
    family: 'source',
    type: 'source_weak',
    inputs: 0,
    outputs: 1,
    delay: 0,
    desc: 'Источник слабого магосигнала уровня 2'
  },
  source_strong_blink: {
    label: 'Мигающий Магоисточник (L3)',
    color: '#ef4444',
    family: 'source',
    type: 'source_strong_blink',
    inputs: 0,
    outputs: 1,
    delay: 0,
    desc: 'Переключаемый сильный источник: запускает импульс сразу и затем каждые 2 секунды до повторного нажатия.'
  },
  source_weak_blink: {
    label: 'Мигающий слабый Магоисточник (L2)',
    color: '#a78bfa',
    family: 'source',
    type: 'source_weak_blink',
    inputs: 0,
    outputs: 1,
    delay: 0,
    desc: 'Переключаемый слабый источник: запускает импульс сразу и затем каждые 2 секунды до повторного нажатия.'
  },

  mi_join: {
    label: 'миСоединение',
    color: '#60a5fa',
    family: 'structural',
    type: 'router_join',
    inputs: 2,
    outputs: 1,
    delay: STRUCTURAL_DELAY,
    desc: 'Структурное объединение потоков, принимает 1/2/3'
  },
  mi_split: {
    label: 'миРасходящеесясоединение',
    color: '#3b82f6',
    family: 'structural',
    type: 'router_split',
    inputs: 1,
    outputs: 2,
    delay: STRUCTURAL_DELAY,
    desc: 'Структурное разветвление потока'
  },

  if_then: {
    label: '|Если>То|',
    color: '#ec4899',
    family: 'logic',
    type: 'logic_if',
    inputs: 2,
    outputs: 1,
    delay: STRUCTURAL_DELAY,
    desc: 'Порт 0: сильный сигнал 3, порт 1: условие DATA'
  },
  and_gate: {
    label: 'И',
    color: '#ec4899',
    family: 'logic',
    type: 'logic_and',
    inputs: 2,
    outputs: 1,
    delay: STRUCTURAL_DELAY,
    desc: 'Порт 0 и 1 должны быть истинны; хотя бы на одном входе нужен уровень 3'
  },
  or_gate: {
    label: 'ИЛИ',
    color: '#ec4899',
    family: 'logic',
    type: 'logic_or',
    inputs: 2,
    outputs: 1,
    delay: STRUCTURAL_DELAY,
    desc: 'Истина на любом входе; хотя бы на одном входе нужен уровень 3'
  },
  not_gate: {
    label: 'НЕ',
    color: '#f59e0b',
    family: 'logic',
    type: 'logic_not',
    inputs: 2,
    outputs: 1,
    delay: STRUCTURAL_DELAY,
    desc: 'Порт 0: сильный сигнал 3, порт 1: условие DATA'
  },

  sl_delay: {
    label: 'слЗадержка',
    color: '#8b5cf6',
    family: 'modifier',
    type: 'delay_block',
    inputs: 1,
    outputs: 1,
    delay: SABRUNE_DELAY,
    desc: 'Сабруна-модификатор, пропускает 1/2/3 с задержкой'
  },

  pr_dorhaain: {
    label: 'прДорхаайн',
    color: '#fcd34d',
    family: 'memory',
    type: 'memory_counter',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_FAST,
    capacityBits: 1,
    desc: 'Прямотечная инфоруна, на импульсе 3 циклически меняет значение 0..1 и отдаёт DATA'
  },
  sl_dorhidorleli: {
    label: 'слДорхидорлели',
    color: '#c084fc',
    family: 'memory',
    type: 'memory_counter',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_COMPLEX,
    capacityBits: 2,
    desc: 'Сложнотечная инфоруна, на импульсе 3 циклически меняет значение 0..3 и отдаёт DATA'
  },

  op_add: { label: '+', color: '#4ade80', family: 'math', type: 'op_add', inputs: 2, outputs: 1, delay: 0, desc: 'Сложение двух DATA' },
  op_sub: { label: '-', color: '#4ade80', family: 'math', type: 'op_sub', inputs: 2, outputs: 1, delay: 0, desc: 'Вычитание двух DATA' },
  op_mul: { label: '*', color: '#4ade80', family: 'math', type: 'op_mul', inputs: 2, outputs: 1, delay: 0, desc: 'Умножение двух DATA' },
  op_div: { label: '/', color: '#4ade80', family: 'math', type: 'op_div', inputs: 2, outputs: 1, delay: 0, desc: 'Деление двух DATA' },
  op_mod: { label: 'Остаток', color: '#4ade80', family: 'math', type: 'op_mod', inputs: 2, outputs: 1, delay: 0, desc: 'Остаток от деления' },
  op_round: { label: 'Округлить', color: '#4ade80', family: 'math', type: 'op_round', inputs: 1, outputs: 1, delay: 0, desc: 'Округление DATA' },
  op_abs: { label: 'Модуль', color: '#4ade80', family: 'math', type: 'op_abs', inputs: 1, outputs: 1, delay: 0, desc: 'Модуль числа' },
  op_sqrt: { label: '√Корень', color: '#4ade80', family: 'math', type: 'op_sqrt', inputs: 1, outputs: 1, delay: 0, desc: 'Квадратный корень' },
  op_random: { label: 'Случайное', color: '#4ade80', family: 'math', type: 'op_random', inputs: 2, outputs: 1, delay: 0, desc: 'Случайное число между A и B' },

  op_lt: { label: '<', color: '#f472b6', family: 'compare', type: 'op_lt', inputs: 2, outputs: 1, delay: 0, desc: 'A < B', editable: true, defaultValue: '' },
  op_gt: { label: '>', color: '#f472b6', family: 'compare', type: 'op_gt', inputs: 2, outputs: 1, delay: 0, desc: 'A > B', editable: true, defaultValue: '' },
  op_eq: { label: '=', color: '#f472b6', family: 'compare', type: 'op_eq', inputs: 2, outputs: 1, delay: 0, desc: 'A = B', editable: true, defaultValue: '' },
  op_contains: { label: 'Содержит', color: '#f472b6', family: 'compare', type: 'op_contains', inputs: 2, outputs: 1, delay: 0, desc: 'Строка содержит подстроку', editable: true, defaultValue: '' },

  op_join: { label: 'Объединить', color: '#fb923c', family: 'string', type: 'op_join', inputs: 2, outputs: 1, delay: 0, desc: 'Склейка строк' },
  op_letter: { label: 'Буква N', color: '#fb923c', family: 'string', type: 'op_letter', inputs: 2, outputs: 1, delay: 0, desc: 'Символ строки по индексу' },
  op_length: { label: 'Длина', color: '#fb923c', family: 'string', type: 'op_length', inputs: 1, outputs: 1, delay: 0, desc: 'Длина строки' },

  val_number: {
    label: 'Число',
    color: '#60a5fa',
    family: 'values',
    type: 'val_number',
    inputs: 2,
    outputs: 2,
    delay: 0,
    desc: 'Порт 0 принимает WEAK/STRONG и проводит его дальше вместе с числом; порт 1 принимает/выдаёт DATA. Без входного сигнала сам не передаёт.',
    editable: true,
    defaultValue: '0'
  },
  val_text: {
    label: 'Текст',
    color: '#60a5fa',
    family: 'values',
    type: 'val_text',
    inputs: 2,
    outputs: 2,
    delay: 0,
    desc: 'Порт 0 принимает WEAK/STRONG и проводит его дальше вместе с текстом; порт 1 принимает/выдаёт DATA. Без входного сигнала сам не передаёт.',
    editable: true,
    defaultValue: ''
  },

  mono_heat: {
    label: 'моНагрев руны',
    color: '#fb7185',
    family: 'effector_mono',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_FAST,
    desc: 'Моноруна: +20°C за 10 минут, только сигнал 3',
    effectText: 'Незначительный нагрев руны'
  },
  mono_push: {
    label: 'моТолкание',
    color: '#93c5fd',
    family: 'effector_mono',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_FAST,
    desc: 'Моноруна: удержание до 10 г, только сигнал 3',
    effectText: 'Слабое постоянное отталкивание'
  },
  mono_light: {
    label: 'моСвет',
    color: '#fbbf24',
    family: 'effector_mono',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_FAST,
    desc: 'Моноруна: слабое красновато-оранжевое свечение, 640 нм',
    effectText: 'Слабое красновато-оранжевое свечение'
  },
  mono_whistle: {
    label: 'моПиск',
    color: '#22c55e',
    family: 'effector_mono',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_FAST,
    desc: 'Моноруна: едва слышимый писк до 15 дБ',
    effectText: 'Едва слышимый писк'
  },
  mono_absorb_sound: {
    label: 'моПоглощение_звука',
    color: '#38bdf8',
    family: 'effector_mono',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_FAST,
    desc: 'Моноруна: базовая шумоизоляция',
    effectText: 'Поглощение звука'
  },

  miro_spark: {
    label: 'миИскра',
    color: '#f97316',
    family: 'effector_miro',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_FAST,
    desc: 'Миротечная: небольшая искра при активации',
    effectText: 'Небольшая искра'
  },
  miro_heat: {
    label: 'миНагрев руны',
    color: '#fb7185',
    family: 'effector_miro',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_FAST,
    desc: 'Миротечная: +30°C за 15 минут',
    effectText: 'Нагрев руны'
  },
  miro_light: {
    label: 'миСвет',
    color: '#fde047',
    family: 'effector_miro',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_FAST,
    desc: 'Миротечная: слабое свечение 640 нм',
    effectText: 'Слабое свечение'
  },
  miro_cool: {
    label: 'миОхлаждение среды',
    color: '#60a5fa',
    family: 'effector_miro',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_FAST,
    desc: 'Миротечная: охлаждение среды до -15°C за 30 минут',
    effectText: 'Охлаждение среды'
  },
  miro_transfer_heat: {
    label: 'миПеренос тепла',
    color: '#c084fc',
    family: 'effector_miro',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_FAST,
    desc: 'Миротечная: увеличение теплопроводности',
    effectText: 'Перенос тепла'
  },
  miro_push: {
    label: 'миТолкание',
    color: '#93c5fd',
    family: 'effector_miro',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_FAST,
    desc: 'Миротечная: удержание до 40 г',
    effectText: 'Слабое постоянное отталкивание'
  },
  miro_whistle: {
    label: 'миПиск',
    color: '#22c55e',
    family: 'effector_miro',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_FAST,
    desc: 'Миротечная: тихий писк до 30 дБ',
    effectText: 'Тихий писк'
  },
  miro_clap: {
    label: 'миХлопок',
    color: '#10b981',
    family: 'effector_miro',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_FAST,
    desc: 'Миротечная: единовременный хлопок до 40 дБ',
    effectText: 'Негромкий хлопок'
  },
  miro_absorb_sound: {
    label: 'миПоглощение_звука',
    color: '#38bdf8',
    family: 'effector_miro',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_FAST,
    desc: 'Миротечная: шумоизоляция',
    effectText: 'Поглощение звука'
  },
  miro_hold_liquid: {
    label: 'миУдержание_жидкости',
    color: '#67e8f9',
    family: 'effector_miro',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_FAST,
    desc: 'Миротечная: удерживает жидкость вдоль поверхности',
    effectText: 'Удержание жидкости'
  },
  miro_attach: {
    label: 'миПрилепление',
    color: '#a3e635',
    family: 'effector_miro',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_FAST,
    desc: 'Миротечная: удержание до 100 г под руной',
    effectText: 'Прилепление к поверхности'
  },

  pr_spark: {
    label: 'прИскра',
    color: '#f97316',
    family: 'effector_priamo',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_FAST,
    desc: 'Прямотечная: искра как у пьезозажигалки',
    effectText: 'Мощная кратковременная искра'
  },
  pr_light: {
    label: 'прСвет',
    color: '#fde047',
    family: 'effector_priamo',
    type: 'effector_light_rgb',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_FAST,
    desc: 'Светильник: принимает только STRONG слева и показывает прохождение сигнала.',
    effectText: 'Ярко-жёлтое свечение',
    maxSubrunes: 1
  },
  pr_flash: {
    label: 'прВспышка',
    color: '#fff59d',
    family: 'effector_priamo',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_FAST,
    desc: 'Прямотечная: короткая вспышка',
    effectText: 'Короткая вспышка'
  },
  pr_push: {
    label: 'прТолчок',
    color: '#93c5fd',
    family: 'effector_priamo',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_FAST,
    desc: 'Прямотечная: короткий толчок до 80 г',
    effectText: 'Короткий толчок'
  },
  pr_accel: {
    label: 'прПродольное ускорение',
    color: '#60a5fa',
    family: 'effector_priamo',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_FAST,
    desc: 'Прямотечная: ускорение твёрдых объектов',
    effectText: 'Продольное ускорение'
  },
  pr_accel_universal: {
    label: 'прПродольное универсальное ускорение',
    color: '#38bdf8',
    family: 'effector_priamo',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_FAST,
    desc: 'Прямотечная: ускорение твёрдых тел, жидкостей и воздуха',
    effectText: 'Продольное универсальное ускорение'
  },

  complex_destroy: {
    label: 'слРазрушение',
    color: '#a855f7',
    family: 'effector_complex',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_COMPLEX,
    desc: 'Сложнотечная: постепенное растрескивание материала',
    effectText: 'Постепенное разрушение',
    maxSubrunes: 2
  },
  complex_audio_write: {
    label: 'слИнкриптор_звукозаписи',
    color: '#818cf8',
    family: 'effector_complex',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_COMPLEX,
    desc: 'Сложнотечная: перевод звука в руническую информацию',
    effectText: 'Запись звука в руническую информацию',
    maxSubrunes: 1
  },
  complex_push: {
    label: 'слТолкание',
    color: '#93c5fd',
    family: 'effector_complex',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_COMPLEX,
    desc: 'Сложнотечная: удержание до 100 г',
    effectText: 'Постоянное несильное отталкивание',
    maxSubrunes: 2
  },
  circle_complex: {
    label: 'кгКомплекс',
    color: '#e879f9',
    family: 'effector_complex',
    type: 'circle_complex',
    inputs: 1,
    outputs: 1,
    delay: CIRCLE_COMPLEX_DELAY,
    desc: 'Комплекс круготечных рун: активация спустя ~3 секунды',
    effectText: 'Активация круготечного комплекса'
  },
  circle_destroy: {
    label: 'кгЦентральное разрушение',
    color: '#e879f9',
    family: 'circle',
    type: 'circle_complex',
    inputs: 1,
    outputs: 1,
    delay: CIRCLE_COMPLEX_DELAY,
    desc: 'Круготечный комплекс: разрушение центра круга',
    effectText: 'Центральное разрушение',
    circleSlots: 12
  },
  circle_read: {
    label: 'кгЦентральное чтение инфорун',
    color: '#f0abfc',
    family: 'circle',
    type: 'circle_complex',
    inputs: 1,
    outputs: 1,
    delay: CIRCLE_COMPLEX_DELAY,
    desc: 'Круготечный комплекс: чтение инфорун в круге',
    effectText: 'Центральное чтение инфорун',
    circleSlots: 9
  },
  circle_hold: {
    label: 'кгЦентральное удерживание',
    color: '#c084fc',
    family: 'circle',
    type: 'circle_complex',
    inputs: 1,
    outputs: 1,
    delay: CIRCLE_COMPLEX_DELAY,
    desc: 'Круготечный комплекс: удержание объекта в центре',
    effectText: 'Центральное удерживание',
    circleSlots: 18
  },
  circle_speaker: {
    label: 'кгЦентральный рупор',
    color: '#d946ef',
    family: 'circle',
    type: 'circle_complex',
    inputs: 1,
    outputs: 1,
    delay: CIRCLE_COMPLEX_DELAY,
    desc: 'Круготечный комплекс: усиленный вывод звука из центра',
    effectText: 'Центральный рупор',
    circleSlots: 6
  },
  kg_dorhidoros: {
    label: 'кгДорхидорос',
    color: '#f5d0fe',
    family: 'circle',
    type: 'circle_memory_bit',
    inputs: 4,
    outputs: 4,
    delay: CIRCLE_COMPLEX_DELAY,
    desc: 'Упрощённая круговая инфоруна: материальная память задаётся вручную или первым DATA в левый верхний вход, виртуальная записывается DATA в верхний правый вход. WEAK/STRONG по левым входам выдают DATA снизу и пропускают управляющий сигнал направо.',
    circleSlots: 9,
    materialBitsCapacity: 80,
    virtualBitsCapacity: 199,
    customValue: '0'
  },
  kg_dirhizadirfir: {
    label: 'кгДирхизадирфир',
    color: '#e9d5ff',
    family: 'circle',
    type: 'circle_memory_dir',
    inputs: 4,
    outputs: 4,
    delay: CIRCLE_COMPLEX_DELAY,
    desc: 'Упрощённая круговая дир-инфоруна: материальная память задаётся вручную или первым DATA в левый верхний вход, виртуальная записывается DATA в верхний правый вход. WEAK/STRONG по левым входам выдают DATA снизу и пропускают управляющий сигнал направо.',
    circleSlots: 12,
    materialDirCapacity: 60,
    virtualDirCapacity: 43,
    customValue: '0'
  },
  ban_pain: {
    label: 'зпБоль',
    color: '#fb7185',
    family: 'effector_forbidden',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_COMPLEX,
    desc: 'Запретотечная: острая поверхностная боль',
    effectText: 'Острая поверхностная боль',
    maxSubrunes: 2
  },
  ban_weakness: {
    label: 'зпСлабость',
    color: '#f87171',
    family: 'effector_forbidden',
    type: 'effector',
    inputs: 1,
    outputs: 1,
    delay: EFFECTOR_DELAY_COMPLEX,
    desc: 'Запретотечная: локальная мышечная слабость',
    effectText: 'Небольшая мышечная слабость',
    maxSubrunes: 3
  },
  sensor_light: {
    label: 'слСветодетектор',
    color: '#fde047',
    family: 'sensor',
    type: 'detector_toggle',
    inputs: 0,
    outputs: 1,
    delay: STRUCTURAL_DELAY,
    desc: 'Переключаемый датчик света: 1 = свет обнаружен, 0 = нет',
    editable: true,
    defaultValue: '1'
  },
  sensor_magic: {
    label: 'слМагодетектор',
    color: '#a78bfa',
    family: 'sensor',
    type: 'detector_toggle',
    inputs: 0,
    outputs: 1,
    delay: STRUCTURAL_DELAY,
    desc: 'Переключаемый датчик магии: 1 = магия обнаружена, 0 = нет',
    editable: true,
    defaultValue: '1'
  },
  censor_moment: {
    label: 'слМагоцензор моментальный',
    color: '#22c55e',
    family: 'control',
    type: 'censor_moment',
    inputs: 1,
    outputs: 1,
    delay: STRUCTURAL_DELAY,
    desc: 'Копит прямые первые сильные импульсы обычных Магоисточников; при 100% выплёвывает по одному импульсу на каждый уникальный источник. Дополнительные уникальные во время прогрева добавляют ещё плевки с шагом 1 с.',
    thresholdMs: 1200
  },
  censor_hold: {
    label: 'слМагоцензор продолжительный',
    color: '#16a34a',
    family: 'control',
    type: 'censor_hold',
    inputs: 1,
    outputs: 1,
    delay: STRUCTURAL_DELAY,
    desc: 'Мгновенно разогревается только от первого сильного сигнала каждого уникального обычного Магоисточника и 5 секунд остывает, пропуская во время остывания слабые и сильные сигналы.',
    thresholdMs: 0,
    closeGapMs: 0,
    coolMs: 5000
  },
  reverse_gate: {
    label: 'слРеверс',
    color: '#60a5fa',
    family: 'control',
    type: 'logic_reverse',
    inputs: 1,
    outputs: 0,
    delay: 0,
    desc: 'Ручной реверс: копит до 3 зарядов от любых сильных потоков обычного Магоисточника и по кнопке ↩ выпускает их обратно.'
  },
  reverse_auto: {
    label: 'слАвтоРеверс',
    color: '#38bdf8',
    family: 'control',
    type: 'logic_reverse_auto',
    inputs: 1,
    outputs: 0,
    delay: 0,
    desc: 'Автоматический реверс: копит до 3 зарядов от сильных потоков обычного Магоисточника и сам выпускает их обратно спустя 0.5–3.0 секунды.',
    editable: true,
    defaultValue: '1500'
  },
  mod_scale_up: {
    label: 'миУсиление',
    color: '#f59e0b',
    family: 'effect_meta',
    type: 'effect_modifier_scale',
    inputs: 1,
    outputs: 1,
    delay: SABRUNE_DELAY,
    desc: 'Малое усиление цепи: примерно повторяет сабруну и даёт эффект +25%, магию +40%, сохраняя цепочную механику.',
    modScale: 'усиление +25%'
  },
  mod_scale_down: {
    label: 'миОслабление',
    color: '#fcd34d',
    family: 'effect_meta',
    type: 'effect_modifier_scale',
    inputs: 1,
    outputs: 1,
    delay: SABRUNE_DELAY,
    desc: 'Малое ослабление цепи: примерно повторяет сабруну и даёт эффект -30%, магию -40%, сохраняя цепочную механику.',
    modScale: 'ослабление -30%'
  },
  mod_freq_up: {
    label: 'слЧастота+',
    color: '#38bdf8',
    family: 'effect_meta',
    type: 'effect_modifier_frequency',
    inputs: 1,
    outputs: 1,
    delay: SABRUNE_DELAY,
    desc: 'Повышение частоты цепи: повторяет базовый сабрунный сдвиг +15% и сохраняет дополнительные эффекты цепи.',
    modFrequency: 'повышенная частота +15%'
  },
  mod_freq_down: {
    label: 'слЧастота-',
    color: '#0ea5e9',
    family: 'effect_meta',
    type: 'effect_modifier_frequency',
    inputs: 1,
    outputs: 1,
    delay: SABRUNE_DELAY,
    desc: 'Понижение частоты цепи: повторяет базовый сабрунный сдвиг -15% и сохраняет дополнительные эффекты цепи.',
    modFrequency: 'пониженная частота -15%'
  },
  dir_forward: {
    label: 'прВперёд',
    color: '#f97316',
    family: 'effect_meta',
    type: 'effect_modifier_direction',
    inputs: 1,
    outputs: 1,
    delay: SABRUNE_DELAY,
    desc: 'Направляет последующий эффект вперёд, как прямотечный сабрунный аналог.',
    modDirection: 'вперёд'
  },
  dir_back: {
    label: 'прНазад',
    color: '#fb923c',
    family: 'effect_meta',
    type: 'effect_modifier_direction',
    inputs: 1,
    outputs: 1,
    delay: SABRUNE_DELAY,
    desc: 'Направляет последующий эффект назад, как прямотечный сабрунный аналог.',
    modDirection: 'назад'
  },
  dir_up: {
    label: 'прВверх',
    color: '#f97316',
    family: 'effect_meta',
    type: 'effect_modifier_direction',
    inputs: 1,
    outputs: 1,
    delay: SABRUNE_DELAY,
    desc: 'Направляет последующий эффект вверх, как прямотечный сабрунный аналог.',
    modDirection: 'вверх'
  },
  dir_down: {
    label: 'прВниз',
    color: '#fb923c',
    family: 'effect_meta',
    type: 'effect_modifier_direction',
    inputs: 1,
    outputs: 1,
    delay: SABRUNE_DELAY,
    desc: 'Направляет последующий эффект вниз, как прямотечный сабрунный аналог.',
    modDirection: 'вниз'
  },
  dir_left: {
    label: 'прВлево',
    color: '#fdba74',
    family: 'effect_meta',
    type: 'effect_modifier_direction',
    inputs: 1,
    outputs: 1,
    delay: SABRUNE_DELAY,
    desc: 'Направляет последующий эффект влево, как прямотечный сабрунный аналог.',
    modDirection: 'влево'
  },
  dir_right: {
    label: 'прВправо',
    color: '#fb7185',
    family: 'effect_meta',
    type: 'effect_modifier_direction',
    inputs: 1,
    outputs: 1,
    delay: SABRUNE_DELAY,
    desc: 'Направляет последующий эффект вправо, как прямотечный сабрунный аналог.',
    modDirection: 'вправо'
  },
  // === САБРУНЫ-МОДИФИКАТОРЫ (прикрепляются к точкам эффекторов) ===
    sub_scale_up:   { label: 'сабУсиление', color: '#f59e0b', family: 'subrune_meta', type: 'sub_modifier_scale', inputs: 1, outputs: 1, delay: 0, desc: 'Сабруна: эффект +25%, магия +40%. Крепится к точке эффектора; задержка 5 мс живёт на мостике.', isSubrune: true, subruneRuleKey: 'sub_scale_up' },
    sub_scale_down: { label: 'сабОслабление', color: '#fcd34d', family: 'subrune_meta', type: 'sub_modifier_scale', inputs: 1, outputs: 1, delay: 0, desc: 'Сабруна: эффект -30%, магия -40%. Крепится к точке эффектора; задержка 5 мс живёт на мостике.', isSubrune: true, subruneRuleKey: 'sub_scale_down' },
    sub_freq_up:    { label: 'сабЧастота+', color: '#38bdf8', family: 'subrune_meta', type: 'sub_modifier_frequency', inputs: 1, outputs: 1, delay: 0, desc: 'Сабруна: частота +15%, магия +50%. Крепится к точке эффектора; задержка 5 мс живёт на мостике.', isSubrune: true, subruneRuleKey: 'sub_freq_up' },
    sub_freq_down:  { label: 'сабЧастота-', color: '#0ea5e9', family: 'subrune_meta', type: 'sub_modifier_frequency', inputs: 1, outputs: 1, delay: 0, desc: 'Сабруна: частота -15%, магия -20%. Крепится к точке эффектора; задержка 5 мс живёт на мостике.', isSubrune: true, subruneRuleKey: 'sub_freq_down' },
    sub_dir_forward:{ label: 'сабВперёд', color: '#f97316', family: 'subrune_meta', type: 'sub_modifier_direction', inputs: 1, outputs: 1, delay: 0, desc: 'Сабруна: направление вперёд. Крепится к точке эффектора; задержка 5 мс живёт на мостике.', isSubrune: true, subruneRuleKey: 'sub_dir_forward' },
    sub_dir_back:   { label: 'сабНазад', color: '#fb923c', family: 'subrune_meta', type: 'sub_modifier_direction', inputs: 1, outputs: 1, delay: 0, desc: 'Сабруна: направление назад. Крепится к точке эффектора; задержка 5 мс живёт на мостике.', isSubrune: true, subruneRuleKey: 'sub_dir_back' },
    sub_dir_up:     { label: 'сабВверх', color: '#f97316', family: 'subrune_meta', type: 'sub_modifier_direction', inputs: 1, outputs: 1, delay: 0, desc: 'Сабруна: направление вверх. Крепится к точке эффектора; задержка 5 мс живёт на мостике.', isSubrune: true, subruneRuleKey: 'sub_dir_up' },
    sub_dir_down:   { label: 'сабВниз', color: '#fb923c', family: 'subrune_meta', type: 'sub_modifier_direction', inputs: 1, outputs: 1, delay: 0, desc: 'Сабруна: направление вниз. Крепится к точке эффектора; задержка 5 мс живёт на мостике.', isSubrune: true, subruneRuleKey: 'sub_dir_down' },
    sub_dir_left:   { label: 'сабВлево', color: '#fdba74', family: 'subrune_meta', type: 'sub_modifier_direction', inputs: 1, outputs: 1, delay: 0, desc: 'Сабруна: направление влево. Крепится к точке эффектора; задержка 5 мс живёт на мостике.', isSubrune: true, subruneRuleKey: 'sub_dir_left' },
    sub_dir_right:  { label: 'сабВправо', color: '#fb7185', family: 'subrune_meta', type: 'sub_modifier_direction', inputs: 1, outputs: 1, delay: 0, desc: 'Сабруна: направление вправо. Крепится к точке эффектора; задержка 5 мс живёт на мостике.', isSubrune: true, subruneRuleKey: 'sub_dir_right' }
};

export const SUBRUNE_RULES = Object.freeze({
    sub_scale_up:   { type: 'scale', factor: 1.25, magicCost: 1.40, allowedFamilies: ['effector_miro', 'effector', 'effector_priamo'] },
    sub_scale_down: { type: 'scale', factor: 0.70, magicCost: 0.60, allowedFamilies: ['effector_miro', 'effector', 'effector_priamo'] },
    sub_freq_up:    { type: 'frequency', shift: 0.15, magicCost: 1.50, allowedFamilies: ['effector', 'effector_light_rgb'] },
    sub_freq_down:  { type: 'frequency', shift: -0.15, magicCost: 0.80, allowedFamilies: ['effector', 'effector_light_rgb'] },
    sub_dir_forward:{ type: 'direction', value: 'вперёд', allowedFamilies: ['effector_priamo', 'effector'] },
    sub_dir_back:   { type: 'direction', value: 'назад', allowedFamilies: ['effector_priamo', 'effector'] },
    sub_dir_up:     { type: 'direction', value: 'вверх', allowedFamilies: ['effector_priamo', 'effector'] },
    sub_dir_down:   { type: 'direction', value: 'вниз', allowedFamilies: ['effector_priamo', 'effector'] },
    sub_dir_left:   { type: 'direction', value: 'влево', allowedFamilies: ['effector_priamo', 'effector'] },
    sub_dir_right:  { type: 'direction', value: 'вправо', allowedFamilies: ['effector_priamo', 'effector'] }
});

CATEGORY_MAP.subrune_meta = 'Сабруны-модификаторы';
CATEGORY_MAP.effect_meta = 'Руны-модификаторы';

export function ensureSimpleCircleDef(def) {
  if (!def) return;
  def.inputs = 4;
  def.outputs = 4;
  def.desc = def.type === 'circle_memory_bit'
    ? 'Упрощённая круговая инфоруна: верхний левый DATA записывает material, верхний правый DATA пишет virtual, левые WEAK/STRONG читают и пропускаются вправо, DATA выходит снизу только при таком чтении.'
    : 'Упрощённая круговая дир-инфоруна: верхний левый DATA записывает material, верхний правый DATA пишет virtual, левые WEAK/STRONG читают и пропускаются вправо, DATA выходит снизу только при таком чтении.';
}

ensureSimpleCircleDef(RUNE_DB.kg_dorhidoros);
ensureSimpleCircleDef(RUNE_DB.kg_dirhizadirfir);
