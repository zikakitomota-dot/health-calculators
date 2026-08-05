import {
  clearErrors,
  getActiveUnit,
  readNumber,
  round,
  setupUnitToggle,
} from "@/scripts/dom"

/** Mifflin-St Jeor Basal Metabolic Rate. Returns kcal/day. */
export function mifflinStJeor(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: "male" | "female",
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === "male" ? base + 5 : base - 161
}

/**
 * Read shared body inputs (sex, age, height, weight) used by several
 * calculators. Returns null if any required field is invalid.
 */
export function readBody(
  form: HTMLFormElement,
  tool: HTMLElement,
): { weightKg: number; heightCm: number; age: number; sex: "male" | "female" } | null {
  const unit = getActiveUnit(tool)
  const sexEl = form.querySelector<HTMLSelectElement>("#sex")
  const sex = (sexEl?.value as "male" | "female") ?? "male"
  const age = readNumber(form.querySelector("#age"), "age", { min: 15, max: 100 })

  let heightCm: number | null = null
  let weightKg: number | null = null

  if (unit === "metric") {
    heightCm = readNumber(form.querySelector("#height-cm"), "height in cm", {
      min: 50,
      max: 272,
    })
    weightKg = readNumber(form.querySelector("#weight-kg"), "weight in kg", {
      min: 10,
      max: 500,
    })
  } else {
    const ft = readNumber(form.querySelector("#height-ft"), "height (ft)", {
      min: 1,
      max: 8,
    })
    const inch = readNumber(form.querySelector("#height-in"), "height (in)", {
      min: 0,
      max: 11.9,
      required: false,
    })
    const lb = readNumber(form.querySelector("#weight-lb"), "weight (lb)", {
      min: 20,
      max: 1100,
    })
    if (ft !== null) heightCm = (ft * 12 + (inch ?? 0)) * 2.54
    if (lb !== null) weightKg = lb * 0.45359237
  }

  if (age === null || heightCm === null || weightKg === null) return null
  return { weightKg, heightCm, age, sex }
}

export function setupBmr() {
  const tool = document.querySelector<HTMLElement>("[data-calc]")?.closest(".tool")
  if (!tool) return
  const form = tool.querySelector<HTMLFormElement>("[data-calc]")!
  const result = tool.querySelector<HTMLElement>("[data-result]")!
  const valueEl = result.querySelector<HTMLElement>("[data-value]")!

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
    const bmr = mifflinStJeor(body.weightKg, body.heightCm, body.age, body.sex)
    valueEl.textContent = `${Math.round(bmr)} kcal/day`
    result.hidden = false
    result.scrollIntoView({ behavior: "smooth", block: "nearest" })
  })

  form.addEventListener("reset", () => {
    clearErrors(form)
    result.hidden = true
  })
}
