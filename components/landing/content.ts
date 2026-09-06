import type { PointObjectLocale } from "@/src/lib/prototype/point-to-object-i18n";

export type LandingRoleKey = "developer" | "owner" | "advisor" | "public";

type LandingRole = {
  label: string;
  title: string;
  body: string;
  outcomes: string[];
  action: string;
};

type LandingPath = {
  number: string;
  name: string;
  title: string;
  body: string;
  action: string;
  href: string;
  localOnly?: boolean;
};

export type LandingContent = {
  brandSubtitle: string;
  nav: [string, string, string];
  actions: { openMap: string; projects: string; profile: string; menu: string };
  hero: {
    eyebrow: string;
    title: string;
    body: string;
    note: string;
    previewLabel: string;
    previewCaption: string;
    previewAlt: string;
  };
  workflow: {
    eyebrow: string;
    title: string;
    body: string;
    localLabel: string;
    paths: LandingPath[];
  };
  roles: {
    eyebrow: string;
    title: string;
    body: string;
    label: string;
    items: Record<LandingRoleKey, LandingRole>;
    consumerTitle: string;
    consumerBody: string;
    consumerAction: string;
  };
  boundary: {
    eyebrow: string;
    title: string;
    body: string;
    currentLabel: string;
    currentTitle: string;
    current: string[];
    gatedLabel: string;
    gatedTitle: string;
    gated: string[];
    sourceLabel: string;
    sourceBody: string;
    caveat: string;
  };
  final: { eyebrow: string; title: string; body: string };
  footer: { product: string; projects: string; profile: string; rights: string };
};

const mapHref = "/prototype/point-to-object";

export const landingRoleKeys: LandingRoleKey[] = ["developer", "owner", "advisor", "public"];

export const landingContent: Record<PointObjectLocale, LandingContent> = {
  en: {
    brandSubtitle: "Location intelligence",
    nav: ["Product", "For your decision", "What is available"],
    actions: { openMap: "Open map", projects: "Projects", profile: "Profile", menu: "Menu" },
    hero: {
      eyebrow: "Spatial decision intelligence",
      title: "Turn a location into a decision path.",
      body:
        "Select a mapped object or area, inspect available context, compare candidates and shape bounded development concepts — with assumptions and missing evidence kept visible.",
      note: "Open-map and sample contexts in the public demo. No confidential data.",
      previewLabel: "Current product preview · Dubai",
      previewCaption: "Real GeoAI interface using OpenFreeMap and OpenStreetMap context.",
      previewAlt:
        "GeoAI map-first workspace showing a three-dimensional Dubai map and the Analyse, Find and Create product modes"
    },
    workflow: {
      eyebrow: "What you can do",
      title: "One map. Four practical working paths.",
      body:
        "Start from the task in front of you. The public demo keeps its source boundary visible and stores project work only in the supported browser-local flow.",
      localLabel: "This device",
      paths: [
        {
          number: "01",
          name: "Analyse",
          title: "Understand a mapped place",
          body: "Choose an object or point and turn available open-map context into a structured decision brief.",
          action: "Open Analyse",
          href: mapHref
        },
        {
          number: "02",
          name: "Find",
          title: "Search and compare visible candidates",
          body: "Set observable criteria, search the current map area and inspect candidates side by side.",
          action: "Open map, then Find",
          href: mapHref
        },
        {
          number: "03",
          name: "Create",
          title: "Shape bounded spatial alternatives",
          body: "Draw or upload one area and explore transparent, deterministic massing options within it.",
          action: "Open map, then Create",
          href: mapHref
        },
        {
          number: "04",
          name: "Projects",
          title: "Return to saved work",
          body: "Reopen work supported by the current browser-local project flow. Cloud collaboration is not active.",
          action: "Open Projects",
          href: "/projects?view=spatial",
          localOnly: true
        }
      ]
    },
    roles: {
      eyebrow: "For your decision",
      title: "Start with the outcome, not a catalogue of layers.",
      body: "Choose the closest working context to see a bounded, current-product path.",
      label: "Choose a working context",
      items: {
        developer: {
          label: "Developer",
          title: "Screen a site before committing deeper diligence.",
          body: "Inspect mapped context, compare visible candidates and frame what must be validated before acquisition or development decisions.",
          outcomes: ["Mapped context", "Candidate comparison", "Validation checklist"],
          action: "Start site screening"
        },
        owner: {
          label: "Owner / manager",
          title: "Explore repositioning hypotheses around an existing asset.",
          body: "Use a selected place and bounded area to organise observed context, development options and unresolved evidence.",
          outcomes: ["Asset context", "Bounded alternatives", "Evidence gaps"],
          action: "Explore an asset"
        },
        advisor: {
          label: "Fund / advisor",
          title: "Structure early spatial pre-diligence without hiding uncertainty.",
          body: "Compare mapped candidates and keep observations, derived implications and hypotheses visibly separate.",
          outcomes: ["Comparable candidates", "Explicit assumptions", "Next checks"],
          action: "Open comparison path"
        },
        public: {
          label: "Urban / public",
          title: "Frame a place-based question with an accountable validation handoff.",
          body: "Review open-map context and bounded concepts while reserving official planning, land and approval decisions for the responsible authority.",
          outcomes: ["Area context", "Scenario framing", "Official handoff"],
          action: "Open map workspace"
        }
      },
      consumerTitle: "Exploring a personal place question?",
      consumerBody: "The same map can help you inspect available open context. It is not an official, legal or financial conclusion.",
      consumerAction: "Explore the map"
    },
    boundary: {
      eyebrow: "Clear operating boundary",
      title: "Use what is available. See what is still gated.",
      body: "The public demo is an evidence-aware workspace, not a substitute for client records, expert review or official authority decisions.",
      currentLabel: "Current product",
      currentTitle: "Available in the current preview",
      current: [
        "Analyse a selected map object or point using available open context.",
        "Find mapped objects in the visible area and compare selected candidates.",
        "Create bounded, deterministic massing concepts inside one selected area.",
        "Return to project work supported by the current browser-local flow."
      ],
      gatedLabel: "Validation required",
      gatedTitle: "Requires a later evidence gate",
      gated: [
        "Parcel, zoning, ownership, planning or valuation evidence from the responsible authority.",
        "Protected customer-data onboarding and multi-user cloud projects.",
        "Customer-specific investment models, approvals and production operation."
      ],
      sourceLabel: "Source context",
      sourceBody: "The interactive map uses OpenFreeMap vector tiles derived from OpenStreetMap data. Coverage can be incomplete or out of date; attribution remains visible in product.",
      caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
    },
    final: {
      eyebrow: "Start from a real place",
      title: "Open the map and make the first decision step visible.",
      body: "Choose a mapped object, search the visible area or draw a bounded zone."
    },
    footer: { product: "Product", projects: "Projects", profile: "Profile", rights: "GeoAI public demo prototype" }
  },
  ru: {
    brandSubtitle: "Геопространственная аналитика",
    nav: ["Продукт", "Для вашей задачи", "Что доступно"],
    actions: { openMap: "Открыть карту", projects: "Проекты", profile: "Профиль", menu: "Меню" },
    hero: {
      eyebrow: "Пространственный интеллект для решений",
      title: "Превратите локацию в понятный путь к решению.",
      body: "Выберите объект или зону на карте, изучите доступный контекст, сравните варианты и сформируйте ограниченные концепции развития — с видимыми допущениями и пробелами в данных.",
      note: "В публичной демоверсии используются открытые и демонстрационные контексты. Без конфиденциальных данных.",
      previewLabel: "Текущий продукт · Дубай",
      previewCaption: "Реальный интерфейс GeoAI на базе OpenFreeMap и контекста OpenStreetMap.",
      previewAlt: "Интерфейс GeoAI с трехмерной картой Дубая и режимами Анализ, Поиск и Создать"
    },
    workflow: {
      eyebrow: "Что можно сделать",
      title: "Одна карта. Четыре практических сценария работы.",
      body: "Начните с вашей задачи. Публичная демоверсия показывает границы источников, а проектная работа сохраняется только в поддерживаемом локальном сценарии браузера.",
      localLabel: "На этом устройстве",
      paths: [
        { number: "01", name: "Анализ", title: "Понять выбранное место", body: "Выберите объект или точку и превратите доступный контекст открытой карты в структурированную аналитическую справку.", action: "Открыть Анализ", href: mapHref },
        { number: "02", name: "Поиск", title: "Найти и сравнить видимые объекты", body: "Задайте наблюдаемые критерии, выполните поиск в текущей области карты и сравните выбранные варианты.", action: "Открыть карту и Поиск", href: mapHref },
        { number: "03", name: "Создать", title: "Сформировать ограниченные пространственные варианты", body: "Нарисуйте или загрузите одну зону и изучите прозрачные детерминированные варианты объёмов внутри неё.", action: "Открыть карту и Создать", href: mapHref },
        { number: "04", name: "Проекты", title: "Вернуться к сохранённой работе", body: "Откройте работу, доступную в текущем локальном сценарии браузера. Облачная совместная работа не активна.", action: "Открыть Проекты", href: "/projects?view=spatial", localOnly: true }
      ]
    },
    roles: {
      eyebrow: "Для вашей задачи",
      title: "Начните с нужного результата, а не с каталога слоёв.",
      body: "Выберите ближайший рабочий контекст, чтобы увидеть ограниченный маршрут в текущем продукте.",
      label: "Выберите рабочий контекст",
      items: {
        developer: { label: "Девелопер", title: "Проверьте площадку до углублённой проверки.", body: "Изучите контекст карты, сравните видимые варианты и зафиксируйте, что нужно подтвердить до решения о приобретении или развитии.", outcomes: ["Контекст карты", "Сравнение вариантов", "План проверки"], action: "Начать скрининг площадки" },
        owner: { label: "Владелец / управляющий", title: "Изучите гипотезы репозиционирования существующего актива.", body: "Используйте выбранное место и ограниченную зону, чтобы связать наблюдаемый контекст, варианты развития и недостающие данные.", outcomes: ["Контекст актива", "Ограниченные варианты", "Пробелы в данных"], action: "Изучить актив" },
        advisor: { label: "Фонд / консультант", title: "Структурируйте раннюю пространственную проверку без скрытой уверенности.", body: "Сравните объекты на карте и явно разделите наблюдения, производные выводы и проверяемые гипотезы.", outcomes: ["Сопоставимые варианты", "Явные допущения", "Следующие проверки"], action: "Открыть сценарий сравнения" },
        public: { label: "Город / госсектор", title: "Сформулируйте вопрос о территории с ответственным переходом к проверке.", body: "Изучите открытый контекст карты и ограниченные концепции, оставляя официальные решения по земле, планированию и согласованиям ответственному органу.", outcomes: ["Контекст зоны", "Рамка сценария", "Официальная проверка"], action: "Открыть карту" }
      },
      consumerTitle: "Изучаете место для личного решения?",
      consumerBody: "Та же карта поможет изучить доступный открытый контекст. Это не официальный, юридический или финансовый вывод.",
      consumerAction: "Изучить карту"
    },
    boundary: {
      eyebrow: "Понятные границы использования",
      title: "Используйте доступное. Видьте то, что ещё требует подтверждения.",
      body: "Публичная демоверсия помогает работать с доказательствами, но не заменяет клиентские документы, экспертизу или решения официальных органов.",
      currentLabel: "Текущий продукт",
      currentTitle: "Доступно в текущем Preview",
      current: [
        "Анализ выбранного объекта или точки с доступным открытым контекстом.",
        "Поиск объектов в видимой области карты и сравнение выбранных вариантов.",
        "Создание ограниченных детерминированных концепций объёмов внутри одной зоны.",
        "Возврат к проектной работе в текущем локальном сценарии браузера."
      ],
      gatedLabel: "Требуется проверка",
      gatedTitle: "Требует отдельной доказательной готовности",
      gated: [
        "Официальные данные о земельных участках, зонировании, собственности, планировании или стоимости.",
        "Защищённая загрузка клиентских данных и многопользовательские облачные проекты.",
        "Клиентские инвестиционные модели, согласования и промышленная эксплуатация."
      ],
      sourceLabel: "Контекст источников",
      sourceBody: "Интерактивная карта использует векторные тайлы OpenFreeMap на основе данных OpenStreetMap. Покрытие может быть неполным или устаревшим; атрибуция остаётся видимой в продукте.",
      caveat: "Screening hypothesis; official validation required; not a legal, cadastral, zoning, planning or valuation conclusion."
    },
    final: {
      eyebrow: "Начните с реального места",
      title: "Откройте карту и сделайте первый шаг решения видимым.",
      body: "Выберите объект, найдите варианты в видимой области или нарисуйте ограниченную зону."
    },
    footer: { product: "Продукт", projects: "Проекты", profile: "Профиль", rights: "GeoAI · Публичная демоверсия" }
  }
};
