import {
  clearErrors,
  getActiveUnit,
  readNumber,
  round,
  setupUnitToggle,
} from "@/scripts/dom"

/** Approximate MET value for walking at a given pace in km/h. */
export function walkingMet(speedKmh: number): number {
  if (speedKmh < 3.2) return 2.0
  if (speedKmh < 4.0) return 2.8
  if (speedKmh < 4.8) return 3.5
  if (speedKmh < 5.6) return 4.3
  if (speedKmh < 6.4) return 5.0
  return 6.3
}

export function setupWalkingCalories() {
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
    let speedKmh: number | null = null

    if (unit === "metric") {
      weightKg = readNumber(form.querySelector("#weight-kg"), "weight in kg", {
        min: 10,
        max: 500,
      })
      speedKmh = readNumber(form.querySelector("#speed-kmh"), "pace in km/h", {
        min: 1,
        max: 12,
      })
    } else {
      const lb = readNumber(form.querySelector("#weight-lb"), "weight (lb)", {
        min: 20,
        max: 1100,
      })
      const mph = readNumber(form.querySelector("#speed-mph"), "pace in mph", {
        min: 0.5,
        max: 8,
      })
      if (lb !== null) weightKg = lb * 0.45359237
      if (mph !== null) speedKmh = mph * 1.609344
    }

    const minutes = readNumber(form.querySelector("#duration"), "duration in minutes", {
      min: 1,
      max: 1440,
    })

    if (weightKg === null || speedKmh === null || minutes === null) {
      result.hidden = true
      return
    }

    const met = walkingMet(speedKmh)
    const hours = minutes / 60
    // kcal = MET × weight(kg) × hours
    const kcal = met * weightKg * hours
    const distanceKm = speedKmh * hours
    const distance =
      unit === "metric"
        ? `${round(distanceKm, 2)} km`
        : `${round(distanceKm / 1.609344, 2)} mi`

    valueEl.textContent = `${Math.round(kcal)} kcal`
    detailEl.innerHTML = `
      <li>Distance covered: <strong>${distance}</strong></li>
      <li>Intensity: <strong>${round(met, 1)} MET</strong></li>
      <li>Burn rate: <strong>${Math.round(kcal / minutes)} kcal/min</strong></li>`
    result.hidden = false
    result.scrollIntoView({ behavior: "smooth", block: "nearest" })
  })

  form.addEventListener("reset", () => {
    clearErrors(form)
    result.hidden = true
  })
}
