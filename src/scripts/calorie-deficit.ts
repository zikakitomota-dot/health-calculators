import { clearErrors, round, setupUnitToggle } from "@/scripts/dom"
import { mifflinStJeor, readBody } from "@/scripts/bmr"
import { ACTIVITY } from "@/scripts/tdee"

// ~7,700 kcal per kg of body fat.
const KCAL_PER_KG = 7700

export function setupCalorieDeficit() {
  const tool = document.querySelector<HTMLElement>("[data-calc]")?.closest(".tool")
  if (!tool) return
  const form = tool.querySelector<HTMLFormElement>("[data-calc]")!
  const result = tool.querySelector<HTMLElement>("[data-result]")!
  const valueEl = result.querySelector<HTMLElement>("[data-value]")!
  const maintenanceEl = result.querySelector<HTMLElement>("[data-maintenance]")!
  const deficitEl = result.querySelector<HTMLElement>("[data-deficit]")!
  const rateEl = result.querySelector<HTMLElement>("[data-rate]")!
  const warnEl = result.querySelector<HTMLElement>("[data-warn]")!

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
    const rateKg = Number(
      form.querySelector<HTMLSelectElement>("#rate")?.value ?? "0.5",
    )

    const bmr = mifflinStJeor(body.weightKg, body.heightCm, body.age, body.sex)
    const tdee = bmr * ACTIVITY[activity].factor
    const dailyDeficit = (rateKg * KCAL_PER_KG) / 7
    const target = tdee - dailyDeficit

    valueEl.textContent = `${Math.round(target)} kcal/day`
    maintenanceEl.textContent = `${Math.round(tdee)} kcal/day`
    deficitEl.textContent = `${Math.round(dailyDeficit)} kcal/day`
    rateEl.textContent = `${round(rateKg, 2)} kg/week`

    // Safety floor: warn if the target drops below common minimums.
    const floor = body.sex === "male" ? 1500 : 1200
    warnEl.hidden = target >= floor
    if (target < floor) {
      warnEl.textContent = `This calculated target is below ${floor} kcal/day, a commonly used minimum reference for ${body.sex === "male" ? "men" : "women"}. It should not be treated as a recommended intake. Consider a slower pace and speak with a qualified healthcare professional for personalised advice.`
    }
    result.hidden = false
    result.scrollIntoView({ behavior: "smooth", block: "nearest" })
  })

  form.addEventListener("reset", () => {
    clearErrors(form)
    result.hidden = true
  })
}
