import type { PointerEventHandler } from 'react'

type TouchControlProps = {
  label: string
  icon: string
  onPress: () => void
  onRelease: () => void
}

function TouchControl({ label, icon, onPress, onRelease }: TouchControlProps) {
  const handlePointerDown: PointerEventHandler<HTMLButtonElement> = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    onPress()
  }

  const handlePointerUp: PointerEventHandler<HTMLButtonElement> = (event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    onRelease()
  }

  return (
    <button
      className="touch-control"
      type="button"
      aria-label={label}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={onRelease}
      onPointerLeave={onRelease}
    >
      <img src={icon} alt="" />
    </button>
  )
}

export default TouchControl
