import {
  clearErrors,
  getActiveUnit,
  readNumber,
  round,
  setupUnitToggle,
} from "@/scripts/dom"

export function setupWaterIntake() {
  const tool = document.querySelector<HTMLElement>("[data-calc]")?.closest(".tool")
  if (!tool) return
  const form = tool.querySelector<HTMLFormElement>("[data-calc]")!
  const result = tool.querySelector<HTMLElement>("[data-result]")!
  const valueEl = result.querySelector<HTMLElement>("[data-value]")!
  const detailEl = result.querySelector<HTMLElement>("[data-detail]")!

  setupUnitToggle(tool, () => {
    clearErrors(form)
    result.hidden = true
  })

  form.addEventListener("submit", (e) => {
    e.preventDefault()
    clearErrors(form)
    const unit = getActiveUnit(tool as HTMLElement)

    let weightKg: number | null = null
    if (unit === "metric") {
      weightKg = readNumber(form.querySelector("#weight-kg"), "weight in kg", {
        min: 10,
        max: 500,
      })
    } else {
      const lb = readNumber(form.querySelector("#weight-lb"), "weight (lb)", {
        min: 20,
        max: 1100,
      })
      if (lb !== null) weightKg = lb * 0.45359237
    }

    const exerciseMin = readNumber(form.querySelector("#exercise"), "exercise minutes", {
      min: 0,
      max: 600,
      required: false,
    })

    if (weightKg === null) {
      result.hidden = true
      return
    }

    // Baseline ~35 ml per kg, plus ~350 ml per 30 min of exercise.
    const baseMl = weightKg * 35
    const exerciseMl = ((exerciseMin ?? 0) / 30) * 350
    const totalMl = baseMl + exerciseMl
    const litres = totalMl / 1000
    const cups = totalMl / 240

    valueEl.textContent = `${round(litres, 1)} litres/day`
    detailEl.innerHTML = `
      <li>About <strong>${Math.round(cups)}</strong> cups (240 ml each)</li>
      <li>Baseline from body weight: <strong>${round(baseMl / 1000, 1)} L</strong></li>
      <li>Added for activity: <strong>${round(exerciseMl / 1000, 2)} L</strong></li>`
    result.hidden = false
    result.scrollIntoView({ behavior: "smooth", block: "nearest" })
  })

  form.addEventListener("reset", () => {
    clearErrors(form)
    result.hidden = true
  })
}
