import type { StudioCompanion, StudioRecipe, TableDefaults } from "@/types/recipe-view"

export const sampleDefaults: TableDefaults = {
  adults: 2,
  kids: 2,
  gourmands: 0,
}

export const sampleRecipe: StudioRecipe = {
  id: "nahled",
  title: "Svíčková na smetaně",
  description: "Ukázkový recept pro prohlídku kuchyně, než připojíte databázi. Krémová omáčka, měkké maso a klidný večer.",
  category: "main",
  prepTimeMins: 30,
  cookTimeMins: 120,
  basePortions: 4,
  caloriesPerPortion: 650,
  calorieTableName: "Svíčková na smetaně",
  imageUrl: null,
  isPublic: false,
  ingredients: [
    { id: "s-1", name: "Hovězí svíčková", amount: 800, unit: "g", category: "Maso", isHero: true },
    { id: "s-2", name: "Kořenová zelenina", amount: 400, unit: "g", category: "Zelenina", isHero: true },
    { id: "s-3", name: "Smetana ke šlehání", amount: 250, unit: "ml", category: "Mléčné", isHero: false },
    { id: "s-4", name: "Máslo", amount: 40, unit: "g", category: "Mléčné", isHero: false },
    { id: "s-5", name: "Sůl", amount: null, unit: null, category: "Koření", isHero: false },
  ],
  steps: [
    { id: "ss-1", stepNumber: 1, instruction: "Maso osolte a opečte na másle ze všech stran, ať chytí barvu." },
    { id: "ss-2", stepNumber: 2, instruction: "Přidejte kořenovou zeleninu a podlijte vodou. Duste pod pokličkou doměkka." },
    { id: "ss-3", stepNumber: 3, instruction: "Zeleninu rozmixujte se smetanou, omáčku provařte a maso nakrájejte." },
  ],
}

export const sampleCompanions: StudioCompanion[] = [
  {
    relationType: "side_dish",
    recipe: {
      id: "nahled-knedlik",
      title: "Houskový knedlík",
      description: "Nadýchaná příloha k omáčce.",
      category: "side",
      prepTimeMins: 20,
      cookTimeMins: 25,
      basePortions: 4,
      caloriesPerPortion: 280,
      calorieTableName: "Houskový knedlík",
      imageUrl: null,
      isPublic: false,
      ingredients: [
        { id: "k-1", name: "Hladká mouka", amount: 400, unit: "g", category: "Přílohy", isHero: true },
        { id: "k-2", name: "Rohlík", amount: 4, unit: "ks", category: "Přílohy", isHero: true },
        { id: "k-3", name: "Mléko", amount: 200, unit: "ml", category: "Mléčné", isHero: false },
      ],
      steps: [
        { id: "ks-1", stepNumber: 1, instruction: "Spojte mouku, mléko a nakrájený rohlík v měkké těsto." },
        { id: "ks-2", stepNumber: 2, instruction: "Tvarujte váleček a vařte v páře nebo ve vodě doměkka." },
      ],
    },
  },
]
