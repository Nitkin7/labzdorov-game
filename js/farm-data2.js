/* Лаборатория здоровья — данные v4: Сад, Пасека, Лес, сезоны, праздники, Травник, большие заказы.
   Формулировки нейтральные: без дозировок, диагнозов и обещаний лечения. */
(function (FD) {
  "use strict";
  /* Уровни до 20, дальше — бесконечные звёзды «Мастер-травник» */
  FD.levelXp = [0, 25, 70, 140, 240, 380, 560, 800, 1100, 1500, 2000, 2600, 3300, 4100, 5000, 6000, 7100, 8300, 9600, 11000];
  FD.levelNames = ["Начинающий огородник", "Любитель трав", "Садовод", "Травник", "Знаток сборов", "Мастер огорода", "Хранитель трав", "Главный травник",
    "Хозяин сада", "Друг пчёл", "Лесной знаток", "Мастер заготовок", "Хранитель угодий", "Знаток ярмарок", "Почётный садовод",
    "Мудрый пасечник", "Хранитель традиций", "Наставник огородников", "Старейшина трав", "Великий травник"];
  FD.starXp = 2500; /* опыт на каждую звезду после 20-го уровня */
  FD.starReward = 200;

  /* Угодья: открываются по уровню и покупаются за монеты */
  FD.areas = [
    { id: "orchard", n: "Сад", lvl: 8, price: 300, img: "apple", d: "Яблони, вишня и ягодные кусты. Сажаете один раз — урожай снова и снова." },
    { id: "apiary", n: "Пасека", lvl: 9, price: 400, img: "hive", d: "Ульи с разными сортами мёда. Цветущие травы на грядках помогают пчёлам." },
    { id: "forest", n: "Лес", lvl: 10, price: 500, img: "porcini", d: "Брусника, черника, клюква и знакомые всем съедобные грибы. Собирайте, когда созреет." }
  ];
  FD.orchardSlots = { start: 2, prices: [200, 350, 550, 800] };       /* до 6 деревьев */
  FD.hiveSlots = { start: 1, prices: [250, 400, 600, 900] };          /* до 5 ульев */

  /* Сад: деревья и кусты. first — первый урожай (мин), re — следующие урожаи (мин), q — сколько плодов */
  FD.trees = [
    { id: "apple", img: "apple", n: "Яблоня", fruit: "Яблоки", one: "яблоко", kind: "tree", leaf: "#5f9a3e", fl: "#d8442a", lvl: 8, sapling: 60, first: 90, re: 40, q: 4, sell: 9, xp: 12,
      facts: ["Яблоня — самое распространённое плодовое дерево в садах России.", "Первые плоды молодая яблоня даёт через несколько лет после посадки.", "Осенние и зимние сорта хорошо лежат в прохладном погребе."] },
    { id: "rosehip", img: "rosehip", n: "Шиповник (куст)", fruit: "Шиповник, плоды", one: "плод шиповника", kind: "bush", leaf: "#4f8a3a", fl: "#d8442a", oval: true, lvl: 8, sapling: 50, first: 60, re: 30, q: 3, sell: 10, xp: 10,
      facts: ["Плоды шиповника собирают осенью, когда они станут ярко-красными.", "Колючий куст шиповника — хорошая живая изгородь.", "Высушенные плоды хранят в бумажных или тканевых мешочках."] },
    { id: "seabuckthorn", img: "seabuckthorn", n: "Облепиха (куст)", fruit: "Облепиха, ягоды", one: "ягода облепихи", kind: "bush", leaf: "#8aa37a", fl: "#f08a1a", cluster: true, lvl: 8, sapling: 70, first: 80, re: 35, q: 3, sell: 12, xp: 12,
      facts: ["Ягоды облепихи держатся на ветках до самых морозов.", "Ветки с ягодами иногда срезают и замораживают целиком.", "Облепиха хорошо растёт на солнечных местах."] },
    { id: "currant", img: "currant", n: "Чёрная смородина (куст)", fruit: "Смородина, ягоды", one: "горсть смородины", kind: "bush", leaf: "#4f8a3a", fl: "#2b2238", lvl: 9, sapling: 80, first: 90, re: 40, q: 4, sell: 10, xp: 13,
      facts: ["Смородину собирают кистями, когда ягоды станут чёрными и блестящими.", "Из смородины варят варенье, джем и компоты.", "Старые ветки куста обрезают — так он лучше плодоносит."] },
    { id: "cherry", img: "cherry", n: "Вишня", fruit: "Вишня, ягоды", one: "горсть вишни", kind: "tree", leaf: "#4f8a3a", fl: "#a8182a", lvl: 10, sapling: 120, first: 120, re: 50, q: 4, sell: 12, xp: 16,
      facts: ["Вишня цветёт белыми цветками в мае, ещё до появления листьев.", "Вишнёвое варенье — одно из самых любимых в России.", "Птицы очень любят спелую вишню — урожай часто укрывают сеткой."] }
  ];

  /* Лес: места сбора. cd — через сколько минут можно собрать снова */
  FD.forest = [
    { id: "lingonberry", img: "lingonberry", n: "Брусника", one: "горсть брусники", kind: "sprig", leaf: "#2f6a35", fl: "#c0202a", lvl: 10, cd: 40, q: 3, sell: 9, xp: 8,
      facts: ["Брусника — низкий вечнозелёный кустик хвойных лесов.", "Ягоды созревают в конце лета и в начале осени.", "Бруснику издавна мочат и заготавливают на зиму."] },
    { id: "blueberry", img: "blueberry", n: "Черника", one: "горсть черники", kind: "sprig", leaf: "#4f8a3a", fl: "#2a2a5a", lvl: 10, cd: 45, q: 3, sell: 10, xp: 9,
      facts: ["Черника растёт в тенистых сосновых и еловых лесах.", "От сока ягод руки и губы становятся синими.", "Ягоды собирают в середине лета."] },
    { id: "chanterelle", img: "chanterelle", n: "Лисички", one: "горсть лисичек", kind: "mush", leaf: "#e8a23a", fl: "#e8a23a", mush: true, lvl: 11, cd: 60, q: 3, sell: 12, xp: 10,
      facts: ["Лисички часто растут целыми семьями во мху.", "Название гриб получил за рыжий, «лисий» цвет.", "Грибы аккуратно срезают ножом, чтобы не повредить грибницу."] },
    { id: "cranberry", img: "cranberry", n: "Клюква", one: "горсть клюквы", kind: "sprig", leaf: "#5f8a4a", fl: "#c0203a", lvl: 12, cd: 70, q: 3, sell: 13, xp: 11,
      facts: ["Клюква растёт на моховых болотах.", "Её собирают осенью, а иногда и весной, из-под снега.", "Ягоды долго хранятся благодаря кислому вкусу."] },
    { id: "porcini", img: "porcini", n: "Белый гриб", one: "белый гриб", kind: "mush", leaf: "#8a5a32", fl: "#8a5a32", mush: true, lvl: 13, cd: 90, q: 2, sell: 22, xp: 14,
      facts: ["Белый гриб в народе зовут боровиком.", "Его сушат связками — так он хорошо хранится.", "Грибы кладут в корзину, а не в пакет, чтобы они не помялись."] }
  ];
  FD.mushNote = "В игре — только съедобные грибы. В настоящем лесу собирайте лишь те грибы, которые точно знаете. Если сомневаетесь — не берите.";

  /* Пасека */
  FD.honey = [
    { id: "flower", n: "Мёд цветочный", sell: 25, col: "#e8a92a", d: "Собран с разных луговых и садовых цветов." },
    { id: "linden", n: "Мёд липовый", sell: 32, col: "#f2d36a", d: "Светлый и душистый. Нужна Липа на грядке.", needPlant: "linden" },
    { id: "buckwheat", n: "Мёд гречишный", sell: 34, col: "#8a4a1a", d: "Тёмный, с ярким вкусом. Нужно «Гречишное поле».", needUp: "buckwheat" }
  ];
  FD.beeGoods = [
    { id: "wax", n: "Пчелиный воск", sell: 20, col: "#f0d080", d: "Из воска делают свечи. Появляется за каждые 3 баночки мёда." },
    { id: "perga", n: "Перга", sell: 40, col: "#b8782a", lvl: 12, d: "Цветочная пыльца, которую пчёлы сложили в соты. Это продукт пчеловодства, а не лекарство. Появляется за каждые 5 баночек мёда с 12-го уровня." }
  ];
  FD.hiveEvery = 30;      /* минут на баночку */
  FD.hiveCap = 3;
  FD.honeyPlants = ["melissa", "thyme", "linden", "oregano", "mint", "chamomile", "calendula", "echinacea", "hypericum", "raspberry", "sage"];
  FD.beeNote = "На мёд и продукты пчеловодства бывает аллергия. Перед применением посоветуйтесь с врачом.";

  /* Новые рецепты: need — полные ключи предметов */
  FD.recipes2 = [
    { id: "jamApple", n: "Яблочное варенье", cat: "jam", col: "#e07a2a", need: { "o:apple": 3 }, price: 45, xp: 12 },
    { id: "jamCurrant", n: "Смородиновое варенье", cat: "jam", col: "#3a2238", need: { "o:currant": 3 }, price: 50, xp: 13 },
    { id: "jamCherry", n: "Вишнёвое варенье", cat: "jam", col: "#8a1a2a", need: { "o:cherry": 3 }, price: 58, xp: 15 },
    { id: "seaHoney", n: "Облепиха, протёртая с мёдом", cat: "jam", col: "#f08a1a", need: { "o:seabuckthorn": 3, "h:flower": 1 }, price: 85, xp: 18 },
    { id: "jamLingon", n: "Брусничное варенье", cat: "jam", col: "#b0202a", need: { "w:lingonberry": 3 }, price: 45, xp: 12 },
    { id: "jamBlue", n: "Черничное варенье", cat: "jam", col: "#3a3a7a", need: { "w:blueberry": 3 }, price: 50, xp: 13 },
    { id: "morsCran", n: "Клюквенный морс", cat: "mors", col: "#c0203a", need: { "w:cranberry": 3 }, price: 55, xp: 14 },
    { id: "morsLingon", n: "Брусничный морс с мёдом", cat: "mors", col: "#d0404a", need: { "w:lingonberry": 2, "h:flower": 1 }, price: 65, xp: 15 },
    { id: "rosehipDrink", n: "Напиток из шиповника", cat: "mors", col: "#c8442a", need: { "o:rosehip": 3 }, price: 45, xp: 12 },
    { id: "pastila", n: "Яблочная пастила", cat: "pastila", col: "#d8a060", need: { "o:apple": 4 }, price: 55, xp: 14 },
    { id: "pastilaHoney", n: "Пастила с липовым мёдом", cat: "pastila", col: "#e0b070", need: { "o:apple": 3, "h:linden": 1 }, price: 90, xp: 20 },
    { id: "honeyLinden", n: "Медовый сбор «Липовый цвет»", cat: "honeymix", col: "#f2d36a", need: { "h:linden": 1, "d:linden": 1, "d:mint": 1 }, price: 115, xp: 24 },
    { id: "honeyMeadow", n: "Медовый сбор «Луговые травы»", cat: "honeymix", col: "#e8a92a", need: { "h:flower": 1, "d:thyme": 1, "d:oregano": 1 }, price: 150, xp: 30 },
    { id: "threeHoney", n: "Набор «Три мёда»", cat: "honeymix", col: "#c07a2a", need: { "h:flower": 1, "h:linden": 1, "h:buckwheat": 1 }, price: 135, xp: 28 },
    { id: "candle", n: "Восковая свеча", cat: "candle", col: "#f0d080", need: { "x:wax": 2 }, price: 55, xp: 12 },
    { id: "forestTea", n: "Лесной чай", cat: "tea", col: "#4a4a8a", need: { "w:blueberry": 1, "w:lingonberry": 1, "d:currant": 1 }, price: 115, xp: 24 },
    { id: "appleTea", n: "Чай с яблоком и мелиссой", cat: "tea", col: "#d8442a", need: { "o:apple": 1, "d:melissa": 1, "d:mint": 1 }, price: 65, xp: 15 },
    { id: "mushDry", n: "Сушёные белые грибы", cat: "mush", col: "#8a5a32", need: { "w:porcini": 3 }, price: 90, xp: 20 },
    { id: "mushChant", n: "Лисички для супа", cat: "mush", col: "#e8a23a", need: { "w:chanterelle": 3 }, price: 50, xp: 13 }
  ];

  /* Сезоны меняются каждую реальную неделю: весна → лето → осень → зима */
  FD.seasons = [
    { id: "spring", n: "Весна", ic: "🌱", fast: ["nettle", "plantain", "mint", "melissa", "cherry"], d: "Крапива, подорожник, мята и мелисса растут быстрее." },
    { id: "summer", n: "Лето", ic: "☀️", fast: ["chamomile", "calendula", "linden", "thyme", "raspberry", "currant", "blueberry", "chanterelle"], d: "Ромашка, календула, липа, малина и черника — быстрее." },
    { id: "autumn", n: "Осень", ic: "🍂", fast: ["rosehip", "seabuckthorn", "echinacea", "hypericum", "apple", "lingonberry", "cranberry", "porcini"], d: "Яблоки, шиповник, облепиха, брусника, клюква и грибы — быстрее." },
    { id: "winter", n: "Зима", ic: "❄️", fast: ["sage", "oregano", "currant", "linden"], d: "Шалфей и душица растут быстрее, а чаи и варенье в спросе." }
  ];
  FD.seasonFast = 0.8;   /* сезонные растения растут на 20% быстрее */
  FD.seasonBonus = 1.25; /* сезонный заказ — на 25% щедрее */

  /* Праздники по реальному календарю. Даты считаются в farm.js (Пасха и Масленица — по православному календарю) */
  FD.events = [
    { id: "newyear", n: "Новый год", ic: "🎄", d: "Готовим подарки к праздничному столу.", wants: ["t:winter", "t:jamCherry", "t:threeHoney", "t:candle", "h:flower", "t:calm"], deco: { id: "fir", n: "Ёлочка у крыльца", ic: "🎄" } },
    { id: "mar8", n: "8 Марта", ic: "💐", d: "Подарки для мам, бабушек и подруг.", wants: ["t:calm", "t:honeyLinden", "t:candle", "h:linden", "t:summer"], deco: { id: "mimosa", n: "Букет мимозы", ic: "💐" } },
    { id: "maslenitsa", n: "Масленица", ic: "🥞", d: "Блины любят мёд и варенье!", wants: ["h:flower", "t:jamApple", "t:jamCurrant", "t:jamLingon", "t:seaHoney", "honey"], deco: { id: "samovar", n: "Расписной самовар", ic: "🫖" } },
    { id: "easter", n: "Пасха", ic: "🥚", d: "Светлый праздник: свечи, мёд и весенние сборы.", wants: ["t:candle", "h:flower", "t:spring", "t:jamCherry", "t:calm"], deco: { id: "basket", n: "Пасхальная корзинка", ic: "🧺" } },
    { id: "honeyspas", n: "Медовый Спас", ic: "🍯", d: "По традиции в этот день пробуют мёд нового урожая.", wants: ["h:flower", "h:linden", "h:buckwheat", "t:threeHoney", "x:wax"], deco: { id: "barrel", n: "Бочонок мёда", ic: "🍯" } },
    { id: "applespas", n: "Яблочный Спас", ic: "🍎", d: "Время собирать яблоки и варить варенье.", wants: ["o:apple", "t:jamApple", "t:pastila", "t:appleTea", "t:pastilaHoney"], deco: { id: "applebasket", n: "Корзина яблок", ic: "🍎" } },
    { id: "elders", n: "День пожилых людей", ic: "🌼", d: "1 октября — поздравляем старшее поколение!", wants: ["t:calm", "t:winter", "t:jamCurrant", "t:honeyMeadow", "t:berry"], deco: { id: "rocking", n: "Кресло-качалка", ic: "🪑" } },
    { id: "pokrov", n: "Покров", ic: "🍂", d: "Урожай собран — время заготовок на зиму.", wants: ["t:jamLingon", "t:morsCran", "t:mushDry", "t:rosehipDrink", "w:cranberry"], deco: { id: "wreath", n: "Осенний венок", ic: "🍁" } }
  ];

  /* Новые улучшения по уровням. g — раздел в «Улучшениях» */
  FD.upgrades2 = [
    { id: "greenhouse", g: "Огород", n: "Теплица", d: "Травы на грядках растут на 15% быстрее.", price: 450, lvl: 9, icon: "greenhouse" },
    { id: "cellar", g: "Кухня", n: "Погреб", d: "Варенье, морсы, пастила и грибные заготовки продаются на 15% дороже.", price: 500, lvl: 10, icon: "cellar" },
    { id: "plot2", g: "Огород", n: "Второй участок", d: "Сразу +4 грядки.", price: 700, lvl: 11, icon: "bed" },
    { id: "extractor", g: "Пасека", n: "Медогонка", d: "Ульи работают на 15% быстрее и хранят до 5 баночек.", price: 600, lvl: 11, icon: "extractor" },
    { id: "buckwheat", g: "Пасека", n: "Гречишное поле", d: "Рядом с пасекой зацветает гречиха — открывается гречишный мёд.", price: 350, lvl: 11, icon: "buckwheat" },
    { id: "bigtable", g: "Кухня", n: "Большой стол рецептов", d: "Кнопка «Собрать × 3» и +10% опыта за рецепты.", price: 800, lvl: 12, icon: "bigtable" },
    { id: "basket", g: "Лес", n: "Большое лукошко", d: "В лесу собираете на 1 больше.", price: 450, lvl: 12, icon: "basket" },
    { id: "helper", g: "Огород", n: "Помощник Степан", d: "Сам поливает всё, что посажено в огороде и в саду.", price: 1000, lvl: 13, icon: "helper" },
    { id: "ladder", g: "Сад", n: "Садовая лестница", d: "С каждого дерева и куста +1 плод.", price: 900, lvl: 14, icon: "ladder" },
    { id: "plot3", g: "Огород", n: "Третий участок", d: "Ещё +4 грядки.", price: 1500, lvl: 15, icon: "bed" },
    { id: "kitchen", g: "Кухня", n: "Летняя кухня", d: "+20% опыта за рецепты, контракты Аптеки щедрее на 10%.", price: 1800, lvl: 16, icon: "kitchen" },
    { id: "gazebo", g: "Двор", n: "Беседка", d: "Покупатели щедрее ещё на 10%.", price: 2500, lvl: 18, icon: "gazebo", decor: true },
    { id: "pond", g: "Двор", n: "Пруд с кувшинками", d: "Всё в огороде, саду и лесу растёт на 5% быстрее.", price: 4000, lvl: 20, icon: "pond", decor: true }
  ];

  /* Наборы «Травника»: собрать все предметы хотя бы раз → постоянный бонус и украшение */
  FD.sets = [
    { id: "pharmacy", n: "Аптекарская грядка", items: ["f:chamomile", "f:calendula", "f:mint", "f:melissa", "f:sage"], bonus: "Свежие и сушёные травы продаются на 5% дороже.", deco: { id: "pot", n: "Глиняный горшок", ic: "🏺" } },
    { id: "tea", n: "Чайная церемония", items: ["t:calm", "t:summer", "t:mountain", "t:winter", "t:mintTea"], bonus: "Чаи и сборы продаются на 5% дороже.", deco: { id: "teapot", n: "Заварочный чайник", ic: "🫖" } },
    { id: "warm", n: "Сбор для холодных вечеров", items: ["d:linden", "d:raspberry", "d:thyme", "d:chamomile", "honey"], bonus: "Подарок дня больше на 10 монет.", deco: { id: "plaid", n: "Клетчатый плед", ic: "🧣" } },
    { id: "summer", n: "Летний сад", items: ["o:apple", "o:cherry", "o:currant", "o:seabuckthorn", "o:rosehip"], bonus: "Сад плодоносит на 10% быстрее.", deco: { id: "swing", n: "Садовые качели", ic: "🌳" } },
    { id: "bees", n: "Медовая полка", items: ["h:flower", "h:linden", "h:buckwheat", "x:wax"], bonus: "Пчёлы работают на 10% быстрее.", deco: { id: "skep", n: "Плетёный улей-колода", ic: "🐝" } },
    { id: "woods", n: "Лесное лукошко", items: ["w:lingonberry", "w:blueberry", "w:cranberry", "w:chanterelle", "w:porcini"], bonus: "В лесу всё созревает на 10% быстрее.", deco: { id: "lukoshko", n: "Берестяное лукошко", ic: "🧺" } },
    { id: "jams", n: "Бабушкины заготовки", items: ["t:jamApple", "t:jamCurrant", "t:jamCherry", "t:jamLingon", "t:morsCran", "t:pastila"], bonus: "Варенье, морсы и пастила продаются на 10% дороже.", deco: { id: "shelf", n: "Полка с банками", ic: "🫙" } },
    { id: "autumn", n: "Осенняя корзинка", items: ["o:rosehip", "o:seabuckthorn", "w:cranberry", "f:echinacea", "t:vitamin"], bonus: "Заказы покупателей щедрее на 5%.", deco: { id: "pumpkin", n: "Тыква у крыльца", ic: "🎃" } }
  ];

  /* Медали (30+). s — счётчик, v — цель, r — награда в монетах */
  FD.achievements = [
    { id: "harv10", n: "Первые пучки", s: "harvested", v: 10, r: 20 }, { id: "harv100", n: "Щедрые грядки", s: "harvested", v: 100, r: 60 },
    { id: "harv500", n: "Неутомимый огородник", s: "harvested", v: 500, r: 150 }, { id: "harv1000", n: "Тысяча урожаев", s: "harvested", v: 1000, r: 300 },
    { id: "ord10", n: "Добрый сосед", s: "ordersDone", v: 10, r: 30 }, { id: "ord50", n: "Любимая лавка", s: "ordersDone", v: 50, r: 80 },
    { id: "ord200", n: "Лавка на всю округу", s: "ordersDone", v: 200, r: 200 },
    { id: "tea10", n: "Чайных дел мастер", s: "teas", v: 10, r: 30 }, { id: "tea50", n: "Знаток рецептов", s: "teas", v: 50, r: 80 },
    { id: "tea200", n: "Полная кладовая", s: "teas", v: 200, r: 200 },
    { id: "sold100", n: "Бойкая торговля", s: "sold", v: 100, r: 40 }, { id: "sold1000", n: "Купец первой гильдии", s: "sold", v: 1000, r: 200 },
    { id: "lv5", n: "Пятый уровень", s: "level", v: 5, r: 30 }, { id: "lv10", n: "Десятый уровень", s: "level", v: 10, r: 100 },
    { id: "lv15", n: "Пятнадцатый уровень", s: "level", v: 15, r: 200 }, { id: "lv20", n: "Двадцатый уровень", s: "level", v: 20, r: 400 },
    { id: "star1", n: "Мастер-травник", s: "stars", v: 1, r: 200 },
    { id: "beds12", n: "Большой огород", s: "beds", v: 12, r: 50 }, { id: "beds20", n: "Три участка", s: "beds", v: 20, r: 200 },
    { id: "orch10", n: "Первый урожай сада", s: "orchard", v: 10, r: 40 }, { id: "orch100", n: "Садовод-ягодник", s: "orchard", v: 100, r: 150 },
    { id: "honey10", n: "Сладкая жизнь", s: "honey", v: 10, r: 40 }, { id: "honey100", n: "Пчеловод", s: "honey", v: 100, r: 150 },
    { id: "forest10", n: "Тропинка в лес", s: "forest", v: 10, r: 40 }, { id: "forest100", n: "Лесной знаток", s: "forest", v: 100, r: 150 },
    { id: "jam10", n: "Варенье к чаю", s: "jams", v: 10, r: 40 }, { id: "jam50", n: "Мастер заготовок", s: "jams", v: 50, r: 120 },
    { id: "contr1", n: "Поставщик аптеки", s: "contracts", v: 1, r: 50 }, { id: "contr5", n: "Надёжный поставщик", s: "contracts", v: 5, r: 150 },
    { id: "fair1", n: "На ярмарку!", s: "fairs", v: 1, r: 30 }, { id: "fair10", n: "Ярмарочный завсегдатай", s: "fairs", v: 10, r: 120 },
    { id: "conv1", n: "Первый обоз", s: "convoys", v: 1, r: 40 }, { id: "conv10", n: "Десять обозов", s: "convoys", v: 10, r: 150 },
    { id: "set1", n: "Первый набор", s: "sets", v: 1, r: 40 }, { id: "set4", n: "Собиратель", s: "sets", v: 4, r: 120 }, { id: "set8", n: "Все наборы", s: "sets", v: 8, r: 300 },
    { id: "ev1", n: "Праздник в огороде", s: "events", v: 1, r: 50 }, { id: "ev4", n: "Круглый год", s: "events", v: 4, r: 150 },
    { id: "chest1", n: "Первый сундучок", s: "chests", v: 1, r: 20 }, { id: "chest30", n: "Месяц заданий", s: "chests", v: 30, r: 200 },
    { id: "week1", n: "Неделя стараний", s: "weekChests", v: 1, r: 60 },
    { id: "album30", n: "Полстраницы альбома", s: "album", v: 30, r: 60 }, { id: "albumAll", n: "Весь Травник", s: "album", v: 999, r: 400 },
    { id: "streak7", n: "Неделя в гостях", s: "giftStreak", v: 7, r: 50 },
    { id: "dog10", n: "Верный друг", s: "dogCare", v: 10, r: 50 }, { id: "guest25", n: "Гроза зайцев", s: "guests", v: 25, r: 80 },
    /* v9: «Тренировка памяти и внимания» */
    { id: "brain10", n: "Разминка для ума", s: "brain", v: 10, r: 40 }, { id: "brain50", n: "Ясный взгляд", s: "brain", v: 50, r: 120 },
    /* v10: «Словодел» — за пройденные раунды */
    { id: "words10", n: "Знаток слов", s: "words", v: 10, r: 50 }, { id: "words40", n: "Мастер слова", s: "words", v: 40, r: 150 },
  ];

  /* Задания дня: 3 в день; когда все выполнены — сундучок */
  FD.dailyTasks = [
    { id: "harvest", t: "Соберите урожай с {n} грядок", n: 6 },
    { id: "water", t: "Полейте {n} грядок", n: 4, noHelper: true },
    { id: "dry", t: "Высушите {n} пучков трав", n: 10 },
    { id: "make", t: "Приготовьте {n} рецепта", n: 3 },
    { id: "order", t: "Выполните {n} заказа покупателей", n: 3 },
    { id: "sell", t: "Продайте {n} товаров", n: 10 },
    { id: "orchard", t: "Соберите урожай в саду {n} раза", n: 2, area: "orchard" },
    { id: "honey", t: "Соберите {n} баночки мёда", n: 3, area: "apiary" },
    { id: "forest", t: "Сходите за дарами леса {n} раза", n: 2, area: "forest" },
    { id: "jam", t: "Сварите {n} банки варенья или морса", n: 2, area: "orchard" },
    { id: "quiz", t: "Сыграйте в «Правда или миф»", n: 1 },
    { id: "brain", t: "Разминка для ума: пройдите «Таблицу Шульте»", n: 1 },
    { id: "words", t: "Словодел: пройдите один раунд", n: 1 }
  ];
  FD.weekChestDays = 5; /* сундучков за неделю для большого сундука */
})(window.LZ_FARM_DATA);
