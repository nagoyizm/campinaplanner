import { type LucideIcon } from 'lucide-react'
import { type ComponentProps } from 'react'

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

export const ICON_SIZES: Record<IconSize, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
}

export const NUMERIC_TO_TOKEN: Record<number, IconSize> = {
  10: 'xs',
  11: 'xs',
  12: 'xs',
  13: 'xs',
  14: 'sm',
  15: 'sm',
  16: 'md',
  18: 'lg',
  20: 'xl',
  22: 'xl',
  24: '2xl',
  28: '3xl',
  32: '3xl',
}

interface IconProps extends Omit<ComponentProps<'svg'>, 'size' | 'color'> {
  icon: LucideIcon
  size?: IconSize | number
  color?: string
  spin?: boolean
}

export default function Icon({
  icon: IconComponent,
  size = 'md',
  color,
  spin = false,
  className,
  'aria-hidden': ariaHidden = true,
  ...rest
}: Readonly<IconProps>) {
  const resolvedSize = typeof size === 'number' ? size : ICON_SIZES[size]

  return (
    <IconComponent
      size={resolvedSize}
      color={color}
      className={spin ? `${className ?? ''} spin`.trim() : className}
      aria-hidden={ariaHidden}
      {...rest}
    />
  )
}
