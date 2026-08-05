import {
  clearErrors,
  getActiveUnit,
  readNumber,
  round,
  setupUnitToggle,
} from "@/scripts/dom"

/** Inches over 5 feet. Height passed in cm. */
function inchesOver5ft(heightCm: number): number {
  const totalIn = heightCm / 2.54
  return Math.max(0, totalIn - 60)
}

export function setupIdealWeight() {
  const tool = document.querySelector<HTMLElement>("[data-calc]")?.closest(".tool")
  if (!tool) return
  const form = tool.querySelector<HTMLFormElement>("[data-calc]")!
  const result = tool.querySelector<HTMLElement>("[data-result]")!
  const valueEl = result.querySelector<HTMLElement>("[data-value]")!
  const listEl = result.querySelector<HTMLElement>("[data-list]")!

  setupUnitToggle(tool, () => {
    clearErrors(form)
    result.hidden = true
  })

  form.addEventListener("submit", (e) => {
    e.preventDefault()
    clearErrors(form)
    const unit = getActiveUnit(tool as HTMLElement)
    const sex = (form.querySelector<HTMLSelectElement>("#sex")?.value ??
      "male") as "male" | "female"

    let heightCm: number | null = null
    if (unit === "metric") {
      heightCm = readNumber(form.querySelector("#height-cm"), "height in cm", {
        min: 120,
        max: 250,
      })
    } else {
      const ft = readNumber(form.querySelector("#height-ft"), "height (ft)", {
        min: 4,
        max: 8,
      })
      const inch = readNumber(form.querySelector("#height-in"), "height (in)", {
        min: 0,
        max: 11.9,
        required: false,
      })
      if (ft !== null) heightCm = (ft * 12 + (inch ?? 0)) * 2.54
    }

    if (heightCm === null) {
      result.hidden = true
      return
    }

    const over = inchesOver5ft(heightCm)
    // Devine, Robinson, Miller formulas (kg)
    const devine = (sex === "male" ? 50 : 45.5) + 2.3 * over
    const robinson = (sex === "male" ? 52 : 49) + (sex === "male" ? 1.9 : 1.7) * over
    const miller = (sex === "male" ? 56.2 : 53.1) + (sex === "male" ? 1.41 : 1.36) * over

    const values = [devine, robinson, miller]
    const lo = Math.min(...values)
    const hi = Math.max(...values)

    const fmt = (kg: number) =>
      unit === "metric"
        ? `${round(kg, 1)} kg`
        : `${round(kg / 0.45359237, 1)} lb`

    valueEl.textContent = `${fmt(lo)} – ${fmt(hi)}`
    listEl.innerHTML = `
      <li>Robinson formula: <strong>${fmt(robinson)}</strong></li>
      <li>Devine formula: <strong>${fmt(devine)}</strong></li>
      <li>Miller formula: <strong>${fmt(miller)}</strong></li>`
    result.hidden = false
    result.scrollIntoView({ behavior: "smooth", block: "nearest" })
  })

  form.addEventListener("reset", () => {
    clearErrors(form)
    result.hidden = true
  })
}
