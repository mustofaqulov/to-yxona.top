export const foods = [
  { id: 'osh', category: 'main', uz: 'Osh', en: 'Plov', ru: 'Плов' },
  { id: 'qozon-kabob', category: 'main', uz: 'Qozon kabob', en: 'Kazan kebab', ru: 'Казан-кебаб' },
  { id: 'manti', category: 'main', uz: 'Manti', en: 'Manti', ru: 'Манты' },
  { id: 'shashlik', category: 'main', uz: 'Shashlik', en: 'Shashlik', ru: 'Шашлык' },
  { id: 'achichuk', category: 'salad', uz: 'Achchiq-chuchuk', en: 'Tomato salad', ru: 'Ачичук' },
  { id: 'olivye', category: 'salad', uz: 'Olivye salati', en: 'Olivier salad', ru: 'Оливье' },
  { id: 'meva', category: 'dessert', uz: 'Meva assortisi', en: 'Fruit platter', ru: 'Фруктовое ассорти' },
  { id: 'shirinlik', category: 'dessert', uz: 'Shirinliklar', en: 'Desserts', ru: 'Десерты' },
] as const;

export const foodIds = new Set<string>(foods.map(food => food.id));
