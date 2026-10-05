import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type GameButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary'
    compact?: boolean
  }
>

function GameButton({
  children,
  variant = 'primary',
  compact = false,
  className = '',
  ...props
}: GameButtonProps) {
  const classes = [
    'game-button',
    `game-button--${variant}`,
    compact ? 'game-button--compact' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={classes} type="button" {...props}>
      <span>{children}</span>
    </button>
  )
}

export default GameButton
