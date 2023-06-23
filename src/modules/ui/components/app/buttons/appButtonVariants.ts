import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export const variantOptions = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-focus-destructive',
  outline: 'border border-primary hover:bg-secondary text-secondary-foreground',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-secondary text-secondary-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
}

export const sizeOptions = {
  icon: 'h-10 p-3 w-10',
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded px-3',
  lg: 'h-11 rounded px-8',
}

export const loaderVariantOptions = {
  white: 'bg-white',
  primary: 'bg-primary',
}

export const buttonVariants = cva(
  'relative inline-flex items-center justify-center rounded text-sm font-medium text-destructive-foreground transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: variantOptions,
      size: sizeOptions,
      isRounded: {
        true: 'rounded-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type ButtonProps = VariantProps<typeof buttonVariants>

export const buttonVariantOptions = Object.keys(variantOptions)
export const buttonSizeOptions = Object.keys(sizeOptions)
