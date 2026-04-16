import type { IWateringCondition, ISensorRule } from '@/api/devices/types/conditions';
import type { IPlantTelemetryStatusConfig, ITelemetryMetricThresholds } from '@/types/device';

type PresetPalette = {
  start: string;
  end: string;
  chip: string;
};

type PresetMetricProfile = {
  trigger: number;
  level: number;
  interval: number;
  tempMin: number;
  airMax: number;
};

type PresetScheduleProfile = {
  times: string[];
  days: number[];
  soilBelow: number;
  tempAbove: number;
  airBelow: number;
  level: number;
};

export interface IPlantPreset {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  latinName: string;
  emoji: string;
  palette: PresetPalette;
  description: string;
  analysis: string;
  lightLabel: string;
  wateringLabel: string;
  humidityLabel: string;
  searchTerms: string[];
  telemetryStatusConfig: IPlantTelemetryStatusConfig;
  wateringConditions: IWateringCondition[];
}

export interface IPlantPresetCategory {
  id: string;
  name: string;
  emoji: string;
  description: string;
  palette: PresetPalette;
  presets: IPlantPreset[];
}

function thresholds(
  lowPoor: number,
  lowModerate: number,
  lowNormal: number,
  lowGood: number,
  highGood: number,
  highNormal: number,
  highModerate: number,
  highPoor: number
): ITelemetryMetricThresholds {
  return {
    low: {
      poor: lowPoor,
      moderate: lowModerate,
      normal: lowNormal,
      good: lowGood,
    },
    high: {
      good: highGood,
      normal: highNormal,
      moderate: highModerate,
      poor: highPoor,
    },
  };
}

const TEMP_WARM = thresholds(10, 16, 19, 22, 28, 31, 35, 40);
const TEMP_TROPICAL = thresholds(12, 18, 21, 24, 29, 32, 36, 40);
const TEMP_COOL = thresholds(6, 12, 16, 19, 24, 27, 31, 36);

const HUMIDITY_ARID = thresholds(10, 18, 25, 35, 50, 60, 72, 85);
const HUMIDITY_MODERATE = thresholds(18, 28, 38, 48, 62, 72, 82, 92);
const HUMIDITY_TROPICAL = thresholds(30, 40, 50, 60, 75, 85, 92, 100);
const HUMIDITY_HUMID = thresholds(40, 50, 60, 68, 82, 90, 96, 100);

const SOIL_DESERT = thresholds(3, 8, 14, 20, 38, 52, 70, 90);
const SOIL_DRY = thresholds(8, 16, 24, 32, 50, 64, 80, 92);
const SOIL_BALANCED = thresholds(12, 22, 32, 42, 62, 76, 88, 96);
const SOIL_MOIST = thresholds(18, 30, 42, 54, 74, 86, 94, 100);

function telemetryConfig(
  temperature: ITelemetryMetricThresholds,
  airHumidity: ITelemetryMetricThresholds,
  soilMoisture: ITelemetryMetricThresholds
): IPlantTelemetryStatusConfig {
  return { temperature, airHumidity, soilMoisture };
}

function rule(field: ISensorRule['field'], operator: ISensorRule['operator'], value: number): ISensorRule {
  return { field, operator, value };
}

function sensorCondition(profile: PresetMetricProfile): IWateringCondition {
  return {
    id: 'preset_sensor',
    plantIndex: 1,
    type: 'sensor',
    level: profile.level,
    interval: profile.interval,
    enabled: true,
    rules: [
      rule('soilMoisture', 'lt', profile.trigger),
      rule('temperature', 'gt', profile.tempMin),
      rule('airHumidity', 'lt', profile.airMax),
    ],
  };
}

function scheduleCondition(profile: PresetScheduleProfile): IWateringCondition {
  return {
    id: 'preset_schedule',
    plantIndex: 1,
    type: 'schedule',
    level: profile.level,
    interval: 0,
    enabled: true,
    rules: [
      rule('soilMoisture', 'lt', profile.soilBelow),
      rule('temperature', 'gt', profile.tempAbove),
      rule('airHumidity', 'lt', profile.airBelow),
    ],
    schedule: {
      time: profile.times[0] ?? '08:00',
      times: profile.times,
      days: profile.days,
    },
  };
}

function buildWateringConditions(
  sensor: PresetMetricProfile,
  schedule: PresetScheduleProfile
): IWateringCondition[] {
  return [sensorCondition(sensor), scheduleCondition(schedule)];
}

type PresetDefinition = Omit<
  IPlantPreset,
  'wateringConditions' | 'telemetryStatusConfig' | 'categoryId' | 'categoryName'
> & {
  telemetryStatusConfig: IPlantTelemetryStatusConfig;
  sensor: PresetMetricProfile;
  schedule: PresetScheduleProfile;
};

function withCategory(
  categoryId: string,
  categoryName: string,
  definition: PresetDefinition
): IPlantPreset {
  return {
    ...definition,
    categoryId,
    categoryName,
    wateringConditions: buildWateringConditions(definition.sensor, definition.schedule),
  };
}

function category(
  id: string,
  name: string,
  emoji: string,
  description: string,
  palette: PresetPalette,
  presets: PresetDefinition[]
): IPlantPresetCategory {
  return {
    id,
    name,
    emoji,
    description,
    palette,
    presets: presets.map((preset) => withCategory(id, name, preset)),
  };
}

export const PLANT_PRESET_CATEGORIES: IPlantPresetCategory[] = [
  category(
    'monstera',
    'Монстеры',
    '🌿',
    'Крупные ароидные с любовью к стабильной умеренной влажности и мягкому воздуху.',
    { start: '#dff5e5', end: '#f7fbec', chip: '#2f855a' },
    [
      {
        id: 'monstera-deliciosa',
        name: 'Монстера деликатесная',
        latinName: 'Monstera deliciosa',
        emoji: '🌿',
        palette: { start: '#dff5e5', end: '#f7fbec', chip: '#2f855a' },
        description:
          'Крупные листья и плотный рост требуют ровной влажности, но без сырого субстрата.',
        analysis:
          'Основной полив срабатывает после уверенного подсыхания почвы. Дополнительный запуск по расписанию включается только утром и вечером, если воздух суховат, температура выше комфортного минимума и почва действительно просела.',
        lightLabel: 'Яркий рассеянный',
        wateringLabel: 'Ровная умеренная влажность',
        humidityLabel: 'Средняя или повышенная',
        searchTerms: ['монстера', 'деликатесная', 'deliciosa', 'monstera deliciosa'],
        telemetryStatusConfig: telemetryConfig(TEMP_WARM, HUMIDITY_TROPICAL, SOIL_BALANCED),
        sensor: { trigger: 36, level: 6, interval: 240, tempMin: 18, airMax: 82 },
        schedule: {
          times: ['08:30', '19:30'],
          days: [1, 3, 5],
          soilBelow: 42,
          tempAbove: 19,
          airBelow: 78,
          level: 4,
        },
      },
      {
        id: 'monstera-adansonii',
        name: 'Монстера Адансона',
        latinName: 'Monstera adansonii',
        emoji: '🍃',
        palette: { start: '#d8f1de', end: '#eef9f0', chip: '#317d59' },
        description:
          'Более тонкие листья испаряют влагу быстрее, поэтому растение чувствительнее к сухому воздуху.',
        analysis:
          'Порог почвы немного выше, чем у крупной монстеры. Расписание добавляет мягкую подстраховку в тёплые дни, но не даст поливу сработать, если субстрат ещё не просох до безопасной зоны.',
        lightLabel: 'Яркий рассеянный',
        wateringLabel: 'Чуть влажнее среднего',
        humidityLabel: 'Повышенная',
        searchTerms: ['монстера', 'адансона', 'adansonii', 'monstera adansonii'],
        telemetryStatusConfig: telemetryConfig(TEMP_WARM, HUMIDITY_TROPICAL, SOIL_MOIST),
        sensor: { trigger: 40, level: 5, interval: 210, tempMin: 19, airMax: 84 },
        schedule: {
          times: ['09:00', '18:30'],
          days: [1, 2, 4, 6],
          soilBelow: 46,
          tempAbove: 20,
          airBelow: 80,
          level: 4,
        },
      },
      {
        id: 'monstera-siltepecana',
        name: 'Монстера сильтепекана',
        latinName: 'Monstera siltepecana',
        emoji: '🌱',
        palette: { start: '#e6f5df', end: '#f8fbef', chip: '#477b55' },
        description:
          'Более компактный лазящий вид. Любит влажный воздух, но не любит сырой ком у корней.',
        analysis:
          'Датчиковое условие держит почву в устойчивой зоне, а расписание помогает только в периоды быстрого высыхания, когда тёплый воздух заметно ускоряет потерю влаги.',
        lightLabel: 'Яркий рассеянный',
        wateringLabel: 'Стабильная мягкая влажность',
        humidityLabel: 'Средняя или повышенная',
        searchTerms: ['монстера', 'сильтепекана', 'siltepecana', 'monstera siltepecana'],
        telemetryStatusConfig: telemetryConfig(TEMP_WARM, HUMIDITY_TROPICAL, SOIL_BALANCED),
        sensor: { trigger: 35, level: 5, interval: 240, tempMin: 18, airMax: 80 },
        schedule: {
          times: ['08:00', '20:00'],
          days: [1, 4, 6],
          soilBelow: 41,
          tempAbove: 19,
          airBelow: 76,
          level: 4,
        },
      },
    ]
  ),
  category(
    'philodendron',
    'Филодендроны',
    '🍀',
    'Тропические лианы и кустовые формы, которым важна стабильность без затяжной сухости.',
    { start: '#e5f6d8', end: '#f8fbef', chip: '#3f8c51' },
    [
      {
        id: 'philodendron-hederaceum',
        name: 'Филодендрон лазящий',
        latinName: 'Philodendron hederaceum',
        emoji: '🍀',
        palette: { start: '#e5f6d8', end: '#f8fbef', chip: '#3f8c51' },
        description: 'Базовый домашний филодендрон, который не любит резкую пересушку кома.',
        analysis:
          'Датчиковое условие запускает полив только при сочетании сухой почвы, тёплого воздуха и не слишком высокой влажности. Расписание дублирует проверку вечером, когда грунт обычно подсыхает быстрее всего.',
        lightLabel: 'Яркий рассеянный',
        wateringLabel: 'Слегка влажно',
        humidityLabel: 'Средняя или повышенная',
        searchTerms: ['филодендрон', 'hederaceum', 'лазящий', 'philodendron hederaceum'],
        telemetryStatusConfig: telemetryConfig(TEMP_WARM, HUMIDITY_TROPICAL, SOIL_BALANCED),
        sensor: { trigger: 35, level: 5, interval: 240, tempMin: 18, airMax: 84 },
        schedule: {
          times: ['08:30', '20:30'],
          days: [1, 3, 5],
          soilBelow: 42,
          tempAbove: 19,
          airBelow: 78,
          level: 4,
        },
      },
      {
        id: 'philodendron-micans',
        name: 'Филодендрон Миканс',
        latinName: 'Philodendron hederaceum var. hederaceum',
        emoji: '🪴',
        palette: { start: '#e9f4db', end: '#fafcf0', chip: '#4b8659' },
        description:
          'Бархатные листья быстрее реагируют на сухой воздух, поэтому режим чуть мягче.',
        analysis:
          'Для этого вида нижний порог влажности почвы поднят, а расписание работает чаще, но только при реальной просадке грунта и суховатом воздухе.',
        lightLabel: 'Яркий рассеянный',
        wateringLabel: 'Мягкая ровная влажность',
        humidityLabel: 'Повышенная',
        searchTerms: ['филодендрон', 'миканс', 'micans', 'philodendron micans'],
        telemetryStatusConfig: telemetryConfig(TEMP_WARM, HUMIDITY_TROPICAL, SOIL_MOIST),
        sensor: { trigger: 38, level: 5, interval: 210, tempMin: 19, airMax: 86 },
        schedule: {
          times: ['09:00', '18:30'],
          days: [1, 2, 4, 6],
          soilBelow: 44,
          tempAbove: 20,
          airBelow: 82,
          level: 4,
        },
      },
      {
        id: 'philodendron-imperial-green',
        name: 'Филодендрон Imperial Green',
        latinName: 'Philodendron erubescens Imperial Green',
        emoji: '🌿',
        palette: { start: '#dff0d7', end: '#f8fbef', chip: '#446f49' },
        description:
          'Кустовая форма с более массивной листвой, которая легче переносит краткое подсыхание.',
        analysis:
          'Почвенный порог ниже, чем у тонколистных форм. Расписание используется как контрольная точка пару раз в неделю, а не как частый жёсткий режим.',
        lightLabel: 'Яркий рассеянный',
        wateringLabel: 'Умеренный стабильный полив',
        humidityLabel: 'Средняя',
        searchTerms: [
          'филодендрон',
          'imperial green',
          'эробесценс',
          'philodendron imperial green',
        ],
        telemetryStatusConfig: telemetryConfig(TEMP_WARM, HUMIDITY_MODERATE, SOIL_BALANCED),
        sensor: { trigger: 32, level: 5, interval: 270, tempMin: 18, airMax: 80 },
        schedule: {
          times: ['08:00', '19:00'],
          days: [2, 5],
          soilBelow: 39,
          tempAbove: 18,
          airBelow: 76,
          level: 4,
        },
      },
    ]
  ),
  category(
    'ficus',
    'Фикусы',
    '🌳',
    'Древесные комнатные растения, которым нужен предсказуемый ритм без качелей сухо/мокро.',
    { start: '#e2f1d5', end: '#fbfdf2', chip: '#4a7c59' },
    [
      {
        id: 'fiddle-leaf-fig',
        name: 'Фикус лирата',
        latinName: 'Ficus lyrata',
        emoji: '🎻',
        palette: { start: '#e6f4dd', end: '#fafcf3', chip: '#567d46' },
        description:
          'Предпочитает стабильный режим и плохо реагирует на затяжное пересыхание большого кома.',
        analysis:
          'Полив запускается умеренно, а расписание проверяет состояние дважды в неделю. Это даёт стабильность крупному горшку, но не превращает почву в сырой тяжёлый ком.',
        lightLabel: 'Очень яркий рассеянный',
        wateringLabel: 'Стабильная умеренная влажность',
        humidityLabel: 'Средняя',
        searchTerms: ['фикус', 'лирата', 'lyrata', 'fiddle leaf fig', 'ficus lyrata'],
        telemetryStatusConfig: telemetryConfig(TEMP_WARM, HUMIDITY_MODERATE, SOIL_BALANCED),
        sensor: { trigger: 34, level: 5, interval: 240, tempMin: 18, airMax: 76 },
        schedule: {
          times: ['08:00', '18:00'],
          days: [2, 5],
          soilBelow: 40,
          tempAbove: 19,
          airBelow: 72,
          level: 4,
        },
      },
      {
        id: 'rubber-plant',
        name: 'Фикус каучуконосный',
        latinName: 'Ficus elastica',
        emoji: '🌳',
        palette: { start: '#e2f1d5', end: '#fbfdf2', chip: '#4a7c59' },
        description: 'Более плотные листья позволяют спокойно переносить лёгкое подсыхание.',
        analysis:
          'Здесь почвенный порог ниже, а расписание реже. Это защищает корни от избытка влаги в квартире с медленным испарением.',
        lightLabel: 'Яркий рассеянный',
        wateringLabel: 'После лёгкого подсыхания',
        humidityLabel: 'Комнатная',
        searchTerms: ['фикус', 'эластика', 'каучуконосный', 'ficus elastica', 'rubber plant'],
        telemetryStatusConfig: telemetryConfig(TEMP_WARM, HUMIDITY_MODERATE, SOIL_BALANCED),
        sensor: { trigger: 30, level: 5, interval: 300, tempMin: 17, airMax: 74 },
        schedule: {
          times: ['08:30'],
          days: [2, 6],
          soilBelow: 36,
          tempAbove: 18,
          airBelow: 70,
          level: 4,
        },
      },
      {
        id: 'ficus-benjamina',
        name: 'Фикус Бенджамина',
        latinName: 'Ficus benjamina',
        emoji: '🌿',
        palette: { start: '#edf3dc', end: '#fbfdf5', chip: '#56734a' },
        description:
          'Тонкая листва и активная крона требуют ровного, но не слишком частого полива.',
        analysis:
          'По датчику полив идёт после выраженного снижения почвенной влаги, а расписание служит как деликатная страховка в тёплые дни, когда крона сушит ком быстрее.',
        lightLabel: 'Яркий рассеянный',
        wateringLabel: 'Умеренный регулярный',
        humidityLabel: 'Средняя',
        searchTerms: ['фикус', 'бенджамина', 'benjamina', 'ficus benjamina'],
        telemetryStatusConfig: telemetryConfig(TEMP_WARM, HUMIDITY_MODERATE, SOIL_BALANCED),
        sensor: { trigger: 33, level: 5, interval: 270, tempMin: 18, airMax: 76 },
        schedule: {
          times: ['08:30', '19:00'],
          days: [1, 4],
          soilBelow: 38,
          tempAbove: 19,
          airBelow: 72,
          level: 4,
        },
      },
    ]
  ),
  category(
    'calathea-maranta',
    'Калатеи и маранты',
    '🌱',
    'Влаголюбивые декоративно-лиственные растения, которые плохо переносят сухой воздух.',
    { start: '#dff2e8', end: '#f6fbf7', chip: '#437a61' },
    [
      {
        id: 'calathea-orbifolia',
        name: 'Калатея Орбифолия',
        latinName: 'Calathea orbifolia',
        emoji: '🌱',
        palette: { start: '#dff2e8', end: '#f6fbf7', chip: '#437a61' },
        description:
          'Широкие листья быстро теряют декоративность при сухом воздухе и пересушке субстрата.',
        analysis:
          'Это один из самых консервативных пресетов: и по датчику, и по расписанию он держит растение в безопасной влажной зоне, но всё ещё требует реального подсыхания почвы перед запуском.',
        lightLabel: 'Рассеянный свет',
        wateringLabel: 'Почва стабильно умеренно влажная',
        humidityLabel: 'Высокая',
        searchTerms: ['калатея', 'орбифолия', 'orbifolia', 'calathea orbifolia'],
        telemetryStatusConfig: telemetryConfig(TEMP_TROPICAL, HUMIDITY_HUMID, SOIL_MOIST),
        sensor: { trigger: 48, level: 6, interval: 180, tempMin: 20, airMax: 92 },
        schedule: {
          times: ['08:00', '19:00'],
          days: [1, 2, 4, 5, 6],
          soilBelow: 54,
          tempAbove: 20,
          airBelow: 88,
          level: 4,
        },
      },
      {
        id: 'calathea-makoyana',
        name: 'Калатея Макояна',
        latinName: 'Calathea makoyana',
        emoji: '🍃',
        palette: { start: '#e8f4e7', end: '#fbfdf7', chip: '#4f7f63' },
        description:
          'Нуждается в влажном воздухе и мягком поливе, но субстрат не должен становиться тяжёлым.',
        analysis:
          'Схема полива чуть мягче, чем у орбифолии: датчиковое условие основное, а расписание лишь аккуратно страхует растение в периоды активного испарения.',
        lightLabel: 'Рассеянный свет',
        wateringLabel: 'Мягкий без пересушки',
        humidityLabel: 'Высокая',
        searchTerms: ['калатея', 'макояна', 'makoyana', 'calathea makoyana'],
        telemetryStatusConfig: telemetryConfig(TEMP_TROPICAL, HUMIDITY_HUMID, SOIL_MOIST),
        sensor: { trigger: 46, level: 5, interval: 180, tempMin: 19, airMax: 90 },
        schedule: {
          times: ['08:30', '18:30'],
          days: [1, 3, 5, 6],
          soilBelow: 52,
          tempAbove: 20,
          airBelow: 86,
          level: 4,
        },
      },
      {
        id: 'maranta-leuconeura',
        name: 'Маранта беложильчатая',
        latinName: 'Maranta leuconeura',
        emoji: '🍀',
        palette: { start: '#e7f6df', end: '#fafdf5', chip: '#4e7c4f' },
        description:
          'Чуть более гибкая, чем калатеи, но всё равно чувствительна к сухому воздуху и горячим потокам.',
        analysis:
          'Порог по почве удерживает растение от провала в сухую зону, а расписание проверяет состояние чаще утром и вечером, если ком подсох и воздух стал слишком сухим.',
        lightLabel: 'Рассеянный свет',
        wateringLabel: 'Ровный влажный режим',
        humidityLabel: 'Средняя или высокая',
        searchTerms: ['маранта', 'leuconeura', 'maranta leuconeura', 'беложильчатая'],
        telemetryStatusConfig: telemetryConfig(TEMP_WARM, HUMIDITY_TROPICAL, SOIL_MOIST),
        sensor: { trigger: 44, level: 5, interval: 210, tempMin: 19, airMax: 88 },
        schedule: {
          times: ['09:00', '20:00'],
          days: [1, 2, 4, 6],
          soilBelow: 50,
          tempAbove: 19,
          airBelow: 84,
          level: 4,
        },
      },
    ]
  ),
  category(
    'pothos-scindapsus',
    'Эпипремнумы и сциндапсусы',
    '🪴',
    'Неприхотливые лианы, которым нужен баланс между просушкой и стабильным ростом.',
    { start: '#d8f1d8', end: '#eef9e9', chip: '#2f855a' },
    [
      {
        id: 'pothos-jade',
        name: 'Эпипремнум зелёный',
        latinName: 'Epipremnum aureum Jade',
        emoji: '🪴',
        palette: { start: '#d8f1d8', end: '#eef9e9', chip: '#2f855a' },
        description:
          'Базовая домашняя форма, которая прощает пересушку, но лучше растёт при умеренно влажном грунте.',
        analysis:
          'Почвенный порог средний, а расписание проверяет субстрат пару раз в неделю. Это помогает сохранить темп роста без риска перелива.',
        lightLabel: 'От полутени до яркого рассеянного',
        wateringLabel: 'После подсыхания верхнего слоя',
        humidityLabel: 'Комнатная',
        searchTerms: ['эпипремнум', 'потос', 'jade', 'epipremnum', 'aureum'],
        telemetryStatusConfig: telemetryConfig(TEMP_WARM, HUMIDITY_MODERATE, SOIL_BALANCED),
        sensor: { trigger: 32, level: 5, interval: 300, tempMin: 17, airMax: 78 },
        schedule: {
          times: ['08:00', '19:30'],
          days: [2, 5],
          soilBelow: 38,
          tempAbove: 18,
          airBelow: 74,
          level: 4,
        },
      },
      {
        id: 'pothos-marble-queen',
        name: 'Эпипремнум Marble Queen',
        latinName: 'Epipremnum aureum Marble Queen',
        emoji: '🤍',
        palette: { start: '#eef4e5', end: '#fcfdf8', chip: '#70835a' },
        description:
          'Пестролистная форма растёт медленнее и чуть дольше держит влагу в горшке.',
        analysis:
          'Здесь порог опущен немного ниже, чем у зелёной формы. Расписание оставлено редким и запускается только при явной потребности по датчикам.',
        lightLabel: 'Яркий рассеянный',
        wateringLabel: 'Умеренно, без сырости',
        humidityLabel: 'Комнатная',
        searchTerms: ['эпипремнум', 'marble queen', 'марбл квин', 'potos marble queen'],
        telemetryStatusConfig: telemetryConfig(TEMP_WARM, HUMIDITY_MODERATE, SOIL_BALANCED),
        sensor: { trigger: 30, level: 4, interval: 330, tempMin: 17, airMax: 76 },
        schedule: {
          times: ['09:00'],
          days: [3, 6],
          soilBelow: 36,
          tempAbove: 18,
          airBelow: 72,
          level: 4,
        },
      },
      {
        id: 'scindapsus-pictus',
        name: 'Сциндапсус pictus',
        latinName: 'Scindapsus pictus',
        emoji: '✨',
        palette: { start: '#dfe9db', end: '#f8fbf5', chip: '#60765c' },
        description:
          'Любит умеренно влажный режим и чувствителен к слишком сухому воздуху при жаре.',
        analysis:
          'Комбинация датчиков не даст запускать полив в прохладной комнате без необходимости, но подстрахует растение в тёплый сухой период.',
        lightLabel: 'Яркий рассеянный',
        wateringLabel: 'Умеренный и ровный',
        humidityLabel: 'Средняя',
        searchTerms: ['сциндапсус', 'pictus', 'scindapsus pictus'],
        telemetryStatusConfig: telemetryConfig(TEMP_WARM, HUMIDITY_MODERATE, SOIL_BALANCED),
        sensor: { trigger: 34, level: 5, interval: 270, tempMin: 18, airMax: 80 },
        schedule: {
          times: ['08:30', '19:00'],
          days: [1, 4],
          soilBelow: 40,
          tempAbove: 19,
          airBelow: 76,
          level: 4,
        },
      },
    ]
  ),
  category(
    'succulents',
    'Суккуленты и кактусы',
    '🌵',
    'Растения сухого цикла, для которых перелив опаснее краткой пересушки.',
    { start: '#eef4d7', end: '#fffdf2', chip: '#7f8a3c' },
    [
      {
        id: 'aloe-vera',
        name: 'Алоэ вера',
        latinName: 'Aloe vera',
        emoji: '🌵',
        palette: { start: '#e6f7d0', end: '#fbfced', chip: '#5a8f45' },
        description: 'Классический суккулент, которому нужен редкий, но точный полив.',
        analysis:
          'Датчиковое условие запускается только при действительно сухой почве. Расписание работает редко и требует одновременно сухого грунта, тёплого воздуха и низкой влажности.',
        lightLabel: 'Яркий свет или солнце',
        wateringLabel: 'Редко, но с промачиванием',
        humidityLabel: 'Низкая',
        searchTerms: ['алоэ', 'aloe vera', 'суккулент'],
        telemetryStatusConfig: telemetryConfig(TEMP_WARM, HUMIDITY_ARID, SOIL_DESERT),
        sensor: { trigger: 14, level: 4, interval: 360, tempMin: 18, airMax: 65 },
        schedule: {
          times: ['10:00'],
          days: [1],
          soilBelow: 18,
          tempAbove: 20,
          airBelow: 55,
          level: 3,
        },
      },
      {
        id: 'haworthia',
        name: 'Хавортия',
        latinName: 'Haworthia attenuata',
        emoji: '🪨',
        palette: { start: '#edf3dc', end: '#fffdf2', chip: '#708146' },
        description:
          'Компактный суккулент, который любит полную просушку верхней части субстрата.',
        analysis:
          'Порог чуть выше, чем у кактуса, но логика та же: сначала сухая почва, потом только мягкий короткий полив.',
        lightLabel: 'Яркий свет',
        wateringLabel: 'Редко и аккуратно',
        humidityLabel: 'Низкая',
        searchTerms: ['хавортия', 'haworthia', 'attenuata'],
        telemetryStatusConfig: telemetryConfig(TEMP_WARM, HUMIDITY_ARID, SOIL_DESERT),
        sensor: { trigger: 16, level: 3, interval: 360, tempMin: 18, airMax: 68 },
        schedule: {
          times: ['10:30'],
          days: [2],
          soilBelow: 20,
          tempAbove: 20,
          airBelow: 58,
          level: 3,
        },
      },
      {
        id: 'echeveria',
        name: 'Эхеверия',
        latinName: 'Echeveria elegans',
        emoji: '🌵',
        palette: { start: '#f1f4d7', end: '#fffdf2', chip: '#7f8a3c' },
        description:
          'Розеточный суккулент, которому особенно опасна сырость в центре розетки и тяжёлый ком.',
        analysis:
          'Здесь и датчик, и расписание удерживают растение в очень сухом диапазоне. Полив слабее и реже, чем у большинства комнатных видов.',
        lightLabel: 'Максимально яркий',
        wateringLabel: 'Очень редко',
        humidityLabel: 'Низкая',
        searchTerms: ['эхеверия', 'echeveria', 'elegans'],
        telemetryStatusConfig: telemetryConfig(TEMP_WARM, HUMIDITY_ARID, SOIL_DESERT),
        sensor: { trigger: 12, level: 3, interval: 360, tempMin: 18, airMax: 60 },
        schedule: {
          times: ['11:00'],
          days: [4],
          soilBelow: 16,
          tempAbove: 20,
          airBelow: 52,
          level: 2,
        },
      },
      {
        id: 'cactus-desert',
        name: 'Пустынный кактус',
        latinName: 'Cactaceae',
        emoji: '🌵',
        palette: { start: '#f1f4d7', end: '#fffdf2', chip: '#7f8a3c' },
        description: 'Самый сухой режим из набора, рассчитанный на мини-кактусы и пустынные формы.',
        analysis:
          'Это максимально осторожный профиль. Расписание включено лишь как редкая еженедельная проверка в тёплый день, если субстрат практически сухой.',
        lightLabel: 'Максимально яркий',
        wateringLabel: 'Очень редко',
        humidityLabel: 'Низкая',
        searchTerms: ['кактус', 'cactus', 'cactaceae', 'пустынный кактус'],
        telemetryStatusConfig: telemetryConfig(TEMP_WARM, HUMIDITY_ARID, SOIL_DESERT),
        sensor: { trigger: 10, level: 3, interval: 360, tempMin: 20, airMax: 55 },
        schedule: {
          times: ['11:30'],
          days: [6],
          soilBelow: 14,
          tempAbove: 22,
          airBelow: 50,
          level: 2,
        },
      },
    ]
  ),
  category(
    'orchid-flowering',
    'Орхидеи и цветущие',
    '🌸',
    'Цветущие комнатные растения, которым нужен аккуратный полив и понятный запас по воздуху.',
    { start: '#f3e4f6', end: '#fff8ff', chip: '#8b5fbf' },
    [
      {
        id: 'orchid-phalaenopsis',
        name: 'Фаленопсис',
        latinName: 'Phalaenopsis',
        emoji: '🌸',
        palette: { start: '#f3e4f6', end: '#fff8ff', chip: '#8b5fbf' },
        description:
          'Тёплая орхидея с воздушным субстратом, который ведёт себя иначе, чем обычный грунт.',
        analysis:
          'Датчик используется как ориентир, а не как попытка держать кору мокрой. Расписание проверяет горшок утром и вечером, но запускает полив только если субстрат действительно подсох и воздух не сырой.',
        lightLabel: 'Яркий рассеянный',
        wateringLabel: 'Когда корни просыхают, но не пересушены',
        humidityLabel: '50% и выше',
        searchTerms: ['фаленопсис', 'orchid', 'phalaenopsis', 'орхидея'],
        telemetryStatusConfig: telemetryConfig(TEMP_TROPICAL, HUMIDITY_TROPICAL, SOIL_BALANCED),
        sensor: { trigger: 30, level: 4, interval: 300, tempMin: 19, airMax: 88 },
        schedule: {
          times: ['08:00', '18:00'],
          days: [1, 4],
          soilBelow: 34,
          tempAbove: 20,
          airBelow: 80,
          level: 3,
        },
      },
      {
        id: 'anthurium',
        name: 'Антуриум',
        latinName: 'Anthurium andraeanum',
        emoji: '❤️',
        palette: { start: '#f6e0de', end: '#fff6f2', chip: '#bf4b4b' },
        description:
          'Теплолюбивое растение с чувствительной корневой системой и высокой потребностью во влажном воздухе.',
        analysis:
          'Датчиковый полив запускается при сочетании сухого грунта и тёплого воздуха. Расписание помогает избегать затяжной сухости в периоды активного цветения, но не включится в прохладе или сырости.',
        lightLabel: 'Яркий рассеянный',
        wateringLabel: 'Стабильная умеренная влажность',
        humidityLabel: 'Повышенная',
        searchTerms: ['антуриум', 'anthurium', 'andraeanum'],
        telemetryStatusConfig: telemetryConfig(TEMP_TROPICAL, HUMIDITY_HUMID, SOIL_BALANCED),
        sensor: { trigger: 38, level: 6, interval: 240, tempMin: 20, airMax: 90 },
        schedule: {
          times: ['08:30', '19:00'],
          days: [1, 3, 5],
          soilBelow: 44,
          tempAbove: 20,
          airBelow: 84,
          level: 4,
        },
      },
      {
        id: 'begonia-rex',
        name: 'Бегония рекс',
        latinName: 'Begonia rex',
        emoji: '🍂',
        palette: { start: '#f6e7df', end: '#fffaf4', chip: '#b46b52' },
        description:
          'Декоративно-лиственная бегония с тонкими листьями и чувствительностью к пересушке.',
        analysis:
          'Здесь расписание работает чаще, но только как деликатная подстраховка. Главный смысл — не дать грунту надолго уйти в сухую зону при тёплом и сухом воздухе.',
        lightLabel: 'Рассеянный свет',
        wateringLabel: 'Без резких пересушек',
        humidityLabel: 'Повышенная',
        searchTerms: ['бегония', 'rex', 'begonia rex'],
        telemetryStatusConfig: telemetryConfig(TEMP_WARM, HUMIDITY_HUMID, SOIL_MOIST),
        sensor: { trigger: 40, level: 5, interval: 180, tempMin: 18, airMax: 88 },
        schedule: {
          times: ['09:00', '18:30'],
          days: [1, 2, 4, 6],
          soilBelow: 46,
          tempAbove: 19,
          airBelow: 82,
          level: 4,
        },
      },
    ]
  ),
  category(
    'dracaena-structural',
    'Драцены и строгие формы',
    '🗡️',
    'Растения, которые лучше переносят сухость, чем постоянную сырость у корней.',
    { start: '#e9f2dd', end: '#fbfdf4', chip: '#607b4d' },
    [
      {
        id: 'dracaena-marginata',
        name: 'Драцена маргината',
        latinName: 'Dracaena marginata',
        emoji: '🪶',
        palette: { start: '#e9f2dd', end: '#fbfdf4', chip: '#607b4d' },
        description:
          'Любит подсыхание верхнего слоя и спокойно переносит более сухой домашний воздух.',
        analysis:
          'Почва может просесть сильнее, чем у ароидов. Расписание добавлено редко и срабатывает только в тёплый сухой день при реальной потребности.',
        lightLabel: 'Рассеянный свет',
        wateringLabel: 'После подсыхания верхней части субстрата',
        humidityLabel: 'Комнатная',
        searchTerms: ['драцена', 'маргината', 'marginata', 'dracaena marginata'],
        telemetryStatusConfig: telemetryConfig(TEMP_WARM, HUMIDITY_MODERATE, SOIL_DRY),
        sensor: { trigger: 26, level: 5, interval: 300, tempMin: 17, airMax: 74 },
        schedule: {
          times: ['09:00'],
          days: [2, 5],
          soilBelow: 32,
          tempAbove: 18,
          airBelow: 70,
          level: 4,
        },
      },
      {
        id: 'dracaena-fragrans',
        name: 'Драцена fragrans',
        latinName: 'Dracaena fragrans',
        emoji: '🌿',
        palette: { start: '#ecf2dd', end: '#fcfdf5', chip: '#65794d' },
        description:
          'Более мягкая по листве форма, которой нужен умеренный режим без резкой пересушки.',
        analysis:
          'Порог почвы немного выше, чем у маргинаты. Расписание помогает удерживать грунт от затяжного провала в сухую зону при тёплом воздухе.',
        lightLabel: 'Рассеянный свет',
        wateringLabel: 'Умеренно, после подсыхания',
        humidityLabel: 'Комнатная или средняя',
        searchTerms: ['драцена', 'fragrans', 'фрагранс', 'dracaena fragrans'],
        telemetryStatusConfig: telemetryConfig(TEMP_WARM, HUMIDITY_MODERATE, SOIL_BALANCED),
        sensor: { trigger: 30, level: 5, interval: 300, tempMin: 18, airMax: 78 },
        schedule: {
          times: ['08:30', '19:00'],
          days: [2, 5],
          soilBelow: 36,
          tempAbove: 19,
          airBelow: 74,
          level: 4,
        },
      },
      {
        id: 'snake-plant',
        name: 'Сансевиерия laurentii',
        latinName: 'Dracaena trifasciata Laurentii',
        emoji: '🗡️',
        palette: { start: '#edf4d7', end: '#fafbec', chip: '#5e6f3a' },
        description:
          'Суккулентный режим: корни лучше терпят сухость, чем постоянную влажность.',
        analysis:
          'Автополив специально редкий. Расписание здесь играет роль редкого контрольного окна и не заменяет реальные условия по почве.',
        lightLabel: 'От солнца до полутени',
        wateringLabel: 'Редкий полив',
        humidityLabel: 'Низкая или комнатная',
        searchTerms: ['сансевиерия', 'laurentii', 'snake plant', 'trifasciata'],
        telemetryStatusConfig: telemetryConfig(TEMP_WARM, HUMIDITY_ARID, SOIL_DRY),
        sensor: { trigger: 18, level: 4, interval: 360, tempMin: 18, airMax: 68 },
        schedule: {
          times: ['11:00'],
          days: [6],
          soilBelow: 22,
          tempAbove: 20,
          airBelow: 60,
          level: 3,
        },
      },
    ]
  ),
];

export const PLANT_PRESETS = PLANT_PRESET_CATEGORIES.flatMap((categoryItem) => categoryItem.presets);

export const PLANT_PRESETS_BY_ID = Object.fromEntries(
  PLANT_PRESETS.map((preset) => [preset.id, preset])
) as Record<string, IPlantPreset>;

export const PLANT_PRESET_CATEGORIES_BY_ID = Object.fromEntries(
  PLANT_PRESET_CATEGORIES.map((categoryItem) => [categoryItem.id, categoryItem])
) as Record<string, IPlantPresetCategory>;

export function getPlantPresetById(presetId?: string | null) {
  if (!presetId) {
    return null;
  }

  return PLANT_PRESETS_BY_ID[presetId] ?? null;
}

export function getPresetCategoryById(categoryId?: string | null) {
  if (!categoryId) {
    return null;
  }

  return PLANT_PRESET_CATEGORIES_BY_ID[categoryId] ?? null;
}

export function getPresetSummaryLabel(presetId?: string | null) {
  const preset = getPlantPresetById(presetId);
  return preset ? `${preset.categoryName} • ${preset.name}` : 'Кастом';
}

export function getPresetWateringConditionsForPlant(presetId: string, plantIndex: number) {
  const preset = getPlantPresetById(presetId);

  if (!preset) {
    return [];
  }

  return preset.wateringConditions.map((condition, index) => ({
    ...condition,
    id: `${preset.id}_${plantIndex}_${index + 1}`,
    plantIndex,
    schedule: condition.schedule
      ? {
          ...condition.schedule,
          time: condition.schedule.times[0] ?? condition.schedule.time ?? '08:00',
        }
      : undefined,
  }));
}

export function findPresetCategories(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return PLANT_PRESET_CATEGORIES;
  }

  return PLANT_PRESET_CATEGORIES.filter((categoryItem) => {
    if (
      categoryItem.name.toLowerCase().includes(normalizedQuery) ||
      categoryItem.description.toLowerCase().includes(normalizedQuery)
    ) {
      return true;
    }

    return categoryItem.presets.some((preset) =>
      [preset.name, preset.latinName, ...preset.searchTerms].some((term) =>
        term.toLowerCase().includes(normalizedQuery)
      )
    );
  });
}
