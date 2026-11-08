/* Лаборатория здоровья — данные усадьбы, версия 1.
   Чаи и сборы здесь только еда и вкус, без лечения. */
(function (root) {
  "use strict";
  root.LZ_YARD = {
    v: 1,
    buildings: [
      { id: "house", n: "Домик травника", lvl: 12, price: 600, d: "Редкие сорта из теплицы и чай к столу. Это вкусы, не лечение." },
      { id: "workshop", n: "Мастерская", lvl: 14, price: 750, d: "Фонарь, цветник и гирлянда из лесных находок." },
      { id: "square", n: "Ярмарочная площадь", lvl: 16, price: 900, d: "История Марьи Петровны и спокойные шаги тропинки. Срока нет." }
    ],
    varieties: [
      { id: "lemon", n: "Мята лимонная", seed: 20, tone: "#d6e27a", cup: "#e7d27a" },
      { id: "daisy", n: "Ромашка крупная", seed: 25, tone: "#f7f3e4", cup: "#f4e7b0" }
    ],
    teas: [
      { id: "lemon", n: "Чай с лимонной мятой", need: { "yd:lemon": 2, "d:melissa": 1 }, note: "Ароматный чай к пирогу." },
      { id: "daisy", n: "Чай крупной ромашки", need: { "yd:daisy": 2, "d:mint": 1 }, note: "Мягкий чай для вечернего стола." }
    ],
    finds: [
      { id: "bark", n: "Береста" },
      { id: "cone", n: "Шишка" },
      { id: "bloom", n: "Луговой цвет" }
    ],
    crafts: [
      { id: "lantern", n: "Фонарь у калитки", coins: 30, need: { bark: 2, cone: 1 } },
      { id: "bed", n: "Цветник у крыльца", coins: 30, need: { bloom: 2, bark: 1 } },
      { id: "garland", n: "Гирлянда над калиткой", coins: 40, need: { cone: 1, bloom: 1, bark: 1 } }
    ]
  };
})(window);
