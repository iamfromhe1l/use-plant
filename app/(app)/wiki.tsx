import React from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  BookOpen,
  Droplets,
  Leaf,
  ListChecks,
  Sprout,
  Waves,
  type LucideIcon,
} from 'lucide-react-native';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';

type WikiSection = {
  id: string;
  title: string;
  summary: string;
  icon: LucideIcon;
  tint: string;
  bg: string;
  blocks: { title: string; body: string }[];
};

const WIKI_SECTIONS: WikiSection[] = [
  {
    id: 'start',
    title: 'Быстрый старт',
    summary: 'От первого входа до первых показаний на экране.',
    icon: Sprout,
    tint: 'text-primary',
    bg: 'bg-primary/10',
    blocks: [
      {
        title: '1. Добавь устройство',
        body: 'На главной нажми кнопку добавления, подключись к сети, которую создаёт устройство, и передай ему данные своей домашней Wi-Fi сети.',
      },
      {
        title: '2. Проверь связь',
        body: 'После подключения устройство должно появиться в списке, а на его карточке начнут обновляться последние показания датчиков.',
      },
      {
        title: '3. Не спеши с автополивом',
        body: 'Сначала посмотри 1–2 дня на реальные показания влажности почвы и воздуха. Это даст базу перед выбором пресета или ручной настройкой шкал.',
      },
    ],
  },
  {
    id: 'telemetry',
    title: 'Датчики и графики',
    summary: 'Как читать показания и что считать нормой.',
    icon: Waves,
    tint: 'text-sky-700',
    bg: 'bg-sky-500/10',
    blocks: [
      {
        title: 'Влажность почвы',
        body: 'Это главный триггер автополива. Смотри не на разовое число, а на траекторию: как быстро грунт теряет влагу между поливами.',
      },
      {
        title: 'Воздух и температура',
        body: 'Они помогают объяснить, почему растение пьёт быстрее или медленнее. Жара и сухой воздух почти всегда ускоряют просадку почвы.',
      },
      {
        title: 'Графики',
        body: 'На странице графиков теперь можно выбирать диапазоны “сегодня”, “вчера”, “неделя”, “месяц” и смотреть весь массив точек за выбранные даты.',
      },
    ],
  },
  {
    id: 'autowater',
    title: 'Автополив',
    summary: 'Когда использовать условия, а когда лучше оставить только ручной полив.',
    icon: Droplets,
    tint: 'text-emerald-700',
    bg: 'bg-emerald-500/10',
    blocks: [
      {
        title: 'Правило по датчику',
        body: 'Это базовый и самый надёжный режим. Полив запускается, когда влажность почвы опускается ниже заданного порога.',
      },
      {
        title: 'Интервал проверки',
        body: 'Короткий интервал даёт более быструю реакцию, но при нестабильных датчиках может лишний раз дёргать полив. Для большинства домашних растений достаточно 3–6 часов.',
      },
      {
        title: 'Отчёты поливов',
        body: 'В журнал теперь попадают и ручные поливы, и автоматические срабатывания. Это позволяет видеть реальную интенсивность системы, а не только действия из приложения.',
      },
    ],
  },
  {
    id: 'presets',
    title: 'Предустановки',
    summary: 'Когда брать готовый шаблон, а когда лучше настраивать вручную.',
    icon: Leaf,
    tint: 'text-lime-700',
    bg: 'bg-lime-500/10',
    blocks: [
      {
        title: 'Что входит в пресет',
        body: 'Пресет сразу задаёт подходящие шкалы, порог автополива и рекомендации по уходу. Это удобная стартовая настройка для конкретного растения.',
      },
      {
        title: 'Как применять',
        body: 'Выбери растение в настройках устройства, открой страницу пресетов и подтверди замену текущих порогов и условий. После этого новые настройки начнут использоваться в системе.',
      },
      {
        title: 'Когда переходить в кастом',
        body: 'Если датчики установлены необычно, почва нестандартная или горшок очень маленький, после нескольких дней наблюдений лучше точечно поправить пресет под реальную динамику.',
      },
    ],
  },
  {
    id: 'workflow',
    title: 'Рекомендуемый порядок',
    summary: 'Рациональная последовательность настройки всей системы.',
    icon: ListChecks,
    tint: 'text-violet-700',
    bg: 'bg-violet-500/10',
    blocks: [
      {
        title: 'Сначала данные',
        body: 'Подключи устройство, проверь показания и собери минимум день графиков без автополива.',
      },
      {
        title: 'Потом пресет',
        body: 'Выбери тип растения, примени пресет и посмотри, насколько его нижний порог совпадает с фактическим поведением почвы.',
      },
      {
        title: 'И только затем жёсткая автоматизация',
        body: 'Когда динамика понятна, можно уменьшать интервал проверки, усиливать уровень полива или точечно сдвигать шкалу статусов.',
      },
    ],
  },
];

export default function WikiScreen() {
  return (
    <View className="bg-background flex-1">
      <ScreenHeader title="Wiki" subtitle="Гайд по системе полива" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="gap-4 px-5 pt-4">
          <Animated.View entering={FadeInDown.delay(40).springify()}>
            <View className="bg-card rounded-[28px] px-5 py-5">
              <View className="mb-4 flex-row items-center gap-3">
                <View className="bg-primary/10 rounded-2xl p-3">
                  <Icon as={BookOpen} size={22} className="text-primary" />
                </View>
                <View className="flex-1">
                  <Text className="text-foreground text-lg font-semibold">
                    Как пользоваться usePlant
                  </Text>
                  <Text className="text-muted-foreground mt-1 text-sm">
                    Здесь собраны основные советы по подключению, поливу, графикам и настройке
                    растений.
                  </Text>
                </View>
              </View>

              <Text className="text-muted-foreground text-sm leading-6">
                Ниже собраны все основные блоки: подключение устройства, чтение показаний,
                автополив, пресеты и порядок настройки системы.
              </Text>
            </View>
          </Animated.View>

          {WIKI_SECTIONS.map((section, index) => (
            <Animated.View
              key={section.id}
              entering={FadeInDown.delay(100 + index * 40).springify()}>
              <View className="bg-card rounded-[30px] p-5">
                <View className="mb-5 flex-row items-center gap-3">
                  <View className={`rounded-2xl p-3 ${section.bg}`}>
                    <Icon as={section.icon} size={22} className={section.tint} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground text-lg font-semibold">{section.title}</Text>
                    <Text className="text-muted-foreground mt-1 text-sm">{section.summary}</Text>
                  </View>
                </View>

                <View className="gap-4">
                  {section.blocks.map((block) => (
                    <View key={block.title} className="bg-secondary/25 rounded-3xl px-4 py-4">
                      <Text className="text-foreground text-base font-semibold">{block.title}</Text>
                      <Text className="text-muted-foreground mt-2 text-sm leading-6">
                        {block.body}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
