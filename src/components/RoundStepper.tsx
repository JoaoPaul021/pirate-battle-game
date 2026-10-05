type RoundStepperProps = {
  label: string
  value: number
  suffix: string
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}

function RoundStepper({
  label,
  value,
  suffix,
  min,
  max,
  step,
  onChange,
}: RoundStepperProps) {
  const decrease = () => onChange(Math.max(min, value - step))
  const increase = () => onChange(Math.min(max, value + step))

  return (
    <div className="stepper-group">
      <span className="stepper-label">{label}</span>
      <div className="stepper-row">
        <button
          className="round-button"
          type="button"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={decrease}
        >
          <img src="/png/default/ui/controls/icon_minus.png" alt="" />
        </button>

        <output className="stepper-value" aria-live="polite">
          {value} {suffix}
        </output>

        <button
          className="round-button"
          type="button"
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={increase}
        >
          <img src="/png/default/ui/controls/icon_plus.png" alt="" />
        </button>
      </div>
      <small>
        {min}-{max} {suffix}
      </small>
    </div>
  )
}

export default RoundStepper
