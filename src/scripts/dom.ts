// Shared DOM helpers for the client-side calculators.

export function $<T extends Element = HTMLElement>(
  sel: string,
  root: ParentNode = document,
): T | null {
  return root.querySelector<T>(sel)
}

export function setError(input: HTMLInputElement | HTMLSelectElement, message: string) {
  const errEl = document.querySelector<HTMLElement>(
    `[data-error-for="${input.id}"]`,
  )
  if (message) {
    input.setAttribute("aria-invalid", "true")
    if (errEl) errEl.textContent = message
  } else {
    input.removeAttribute("aria-invalid")
    if (errEl) errEl.textContent = ""
  }
}

export function clearErrors(form: HTMLFormElement) {
  form.querySelectorAll<HTMLInputElement>("input,select").forEach((el) => {
    el.removeAttribute("aria-invalid")
  })
  form
    .querySelectorAll<HTMLElement>("[data-error-for]")
    .forEach((el) => (el.textContent = ""))
}

/**
 * Validate that a field holds a finite number within [min,max].
 * Returns the parsed number, or null (and sets an error) when invalid.
 */
export function readNumber(
  input: HTMLInputElement | null,
  label: string,
  { min, max, required = true }: { min: number; max: number; required?: boolean },
): number | null {
  if (!input) return null
  const raw = input.value.trim()
  if (raw === "") {
    if (required) {
      setError(input, `Please enter ${label}.`)
      return null
    }
    setError(input, "")
    return null
  }
  const value = Number(raw)
  if (!Number.isFinite(value)) {
    setError(input, `${label} must be a number.`)
    return null
  }
  if (value < min || value > max) {
    setError(input, `${label} must be between ${min} and ${max}.`)
    return null
  }
  setError(input, "")
  return value
}

export function round(value: number, decimals = 1) {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

/**
 * Wire a metric/imperial unit toggle. Calls onChange with the active system.
 */
export function setupUnitToggle(
  root: ParentNode,
  onChange: (system: "metric" | "imperial") => void,
) {
  const buttons = root.querySelectorAll<HTMLButtonElement>("[data-unit]")
  const metric = root.querySelector<HTMLElement>("[data-metric]")
  const imperial = root.querySelector<HTMLElement>("[data-imperial]")

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const system = btn.dataset.unit as "metric" | "imperial"
      buttons.forEach((b) =>
        b.setAttribute("aria-pressed", String(b === btn)),
      )
      if (metric) metric.hidden = system !== "metric"
      if (imperial) imperial.hidden = system !== "imperial"
      onChange(system)
    })
  })
}

export function getActiveUnit(root: ParentNode): "metric" | "imperial" {
  const active = root.querySelector<HTMLButtonElement>(
    '[data-unit][aria-pressed="true"]',
  )
  return (active?.dataset.unit as "metric" | "imperial") ?? "metric"
}
