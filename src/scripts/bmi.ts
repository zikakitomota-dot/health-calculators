import {
  clearErrors,
  getActiveUnit,
  readNumber,
  round,
  setupUnitToggle,
} from "@/scripts/dom"

function categorize(bmi: number) {
  if (bmi < 18.5) {
    return {
      label: "Underweight range",
      interpretation: "This result falls below the common healthy-weight BMI range for adults.",
    }
  }
  if (bmi < 25) {
    return {
      label: "Healthy weight range",
      interpretation: "This result falls within the common healthy-weight BMI range for adults.",
    }
  }
  if (bmi < 30) {
    return {
      label: "Overweight range",
      interpretation: "This result falls within the common overweight BMI range for adults.",
    }
  }
  return {
    label: "Obesity range",
    interpretation: "This result falls within the common obesity BMI range for adults.",
  }
}

export function setupBmi() {
  const tool = document.querySelector<HTMLElement>("[data-calc]")?.closest(".tool")
  if (!tool) return
  const form = tool.querySelector<HTMLFormElement>("[data-calc]")!
  const result = tool.querySelector<HTMLElement>("[data-result]")!
  const valueEl = result.querySelector<HTMLElement>("[data-value]")!
  const categoryEl = result.querySelector<HTMLElement>("[data-category]")!
  const interpretationEl = result.querySelector<HTMLElement>(
    "[data-interpretation]",
  )!

  setupUnitToggle(tool, () => {
    clearErrors(form)
    result.hidden = true
  })

  form.addEventListener("submit", (e) => {
    e.preventDefault()
    clearErrors(form)
    const unit = getActiveUnit(tool)
    let heightM: number | null = null
    let weightKg: number | null = null

    if (unit === "metric") {
      const cm = readNumber(form.querySelector("#height-cm"), "height in cm", {
        min: 50,
        max: 272,
      })
      weightKg = readNumber(form.querySelector("#weight-kg"), "weight in kg", {
        min: 10,
        max: 500,
      })
      if (cm !== null) heightM = cm / 100
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
      if (ft !== null) {
        const totalIn = ft * 12 + (inch ?? 0)
        heightM = totalIn * 0.0254
      }
      if (lb !== null) weightKg = lb * 0.45359237
    }

    if (heightM === null || weightKg === null) {
      result.hidden = true
      return
    }

    const bmi = weightKg / (heightM * heightM)
    const category = categorize(bmi)
    valueEl.textContent = String(round(bmi, 1))
    categoryEl.textContent = category.label
    interpretationEl.textContent = category.interpretation
    result.hidden = false
    result.scrollIntoView({ behavior: "smooth", block: "nearest" })
  })

  form.addEventListener("reset", () => {
    clearErrors(form)
    result.hidden = true
  })
}
