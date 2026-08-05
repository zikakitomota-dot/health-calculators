export interface CalculatorMeta {
  slug: string
  name: string
  short: string
  description: string
  category: "Body" | "Energy" | "Nutrition" | "Activity"
}

export const calculators: CalculatorMeta[] = [
  {
    slug: "bmi",
    name: "BMI Calculator",
    short: "Body Mass Index",
    description:
      "Estimate your Body Mass Index from height and weight, in metric or imperial units.",
    category: "Body",
  },
  {
    slug: "bmr",
    name: "BMR Calculator",
    short: "Basal Metabolic Rate",
    description:
      "Calculate the calories your body burns at rest using the Mifflin-St Jeor equation.",
    category: "Energy",
  },
  {
    slug: "tdee",
    name: "TDEE Calculator",
    short: "Total Daily Energy Expenditure",
    description:
      "Estimate the total calories you burn per day based on your activity level.",
    category: "Energy",
  },
  {
    slug: "ideal-weight",
    name: "Ideal Weight Calculator",
    short: "Healthy weight range",
    description:
      "Find a healthy target weight range using established Robinson and Devine formulas.",
    category: "Body",
  },
  {
    slug: "calorie-deficit",
    name: "Calorie Deficit Calculator",
    short: "Daily deficit for weight loss",
    description:
      "Work out the daily calorie target needed to reach a weight goal at a chosen pace.",
    category: "Nutrition",
  },
  {
    slug: "water-intake",
    name: "Water Intake Calculator",
    short: "Daily hydration goal",
    description:
      "Estimate how much water to drink each day based on body weight and activity.",
    category: "Nutrition",
  },
  {
    slug: "walking-calories",
    name: "Walking Calories Calculator",
    short: "Calories burned walking",
    description:
      "Estimate calories burned on a walk from your weight, pace, and duration.",
    category: "Activity",
  },
]

export function getCalculator(slug: string) {
  return calculators.find((c) => c.slug === slug)
}

export function relatedCalculators(slug: string, count = 3) {
  return calculators.filter((c) => c.slug !== slug).slice(0, count)
}
