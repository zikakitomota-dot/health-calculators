import { clearErrors, setupUnitToggle } from "@/scripts/dom"
import { mifflinStJeor, readBody } from "@/scripts/bmr"

export const ACTIVITY: Record<string, { factor: number; label: string }> = {
  sedentary: { factor: 1.2, label: "Sedentary (little or no exercise)" },
  light: { factor: 1.375, label: "Lightly active (1–3 days/week)" },
  moderate: { factor: 1.55, label: "Moderately active (3–5 days/week)" },
  active: { factor: 1.725, label: "Very active (6–7 days/week)" },
  athlete: { factor: 1.9, label: "Extra active (hard training/physical job)" },
}

export function setupTdee() {
  const tool = document.querySelector<HTMLElement>("[data-calc]")?.closest(".tool")
  if (!tool) return
  const form = tool.querySelector<HTMLFormElement>("[data-calc]")!
  const result = tool.querySelector<HTMLElement>("[data-result]")!
  const valueEl = result.querySelector<HTMLElement>("[data-value]")!
  const bmrEl = result.querySelector<HTMLElement>("[data-bmr]")!
  const activityEl = result.querySelector<HTMLElement>("[data-activity]")!

  setupUnitToggle(tool, () => {
    clearErrors(form)
    result.hidden = true
  })

  form.addEventListener("submit", (e) => {
    e.preventDefault()
    clearErrors(form)
    const body = readBody(form, tool as HTMLElement)
    if (!body) {
      result.hidden = true
      return
    }
    const activity = (form.querySelector<HTMLSelectElement>("#activity")?.value ??
      "sedentary") as keyof typeof ACTIVITY
    const bmr = mifflinStJeor(body.weightKg, body.heightCm, body.age, body.sex)
    const tdee = bmr * ACTIVITY[activity].factor

    valueEl.textContent = `${Math.round(tdee)} kcal/day`
    bmrEl.textContent = `${Math.round(bmr)} kcal/day`
    activityEl.textContent = ACTIVITY[activity].label
    result.hidden = false
    result.scrollIntoView({ behavior: "smooth", block: "nearest" })
  })

  form.addEventListener("reset", () => {
    clearErrors(form)
    result.hidden = true
  })
}
