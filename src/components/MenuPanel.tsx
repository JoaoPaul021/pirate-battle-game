import type { PropsWithChildren } from 'react'

type MenuPanelProps = PropsWithChildren<{
  className?: string
  labelledBy?: string
}>

function MenuPanel({ children, className = '', labelledBy }: MenuPanelProps) {
  return (
    <section
      className={`menu-panel ${className}`.trim()}
      aria-labelledby={labelledBy}
    >
      {children}
    </section>
  )
}

export default MenuPanel
