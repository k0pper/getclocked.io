import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const button = cva(
  'inline-flex select-none items-center justify-center gap-2 rounded-full font-sans font-semibold uppercase tracking-[0.12em] transition-[transform,filter,box-shadow,color,background-color,border-color] duration-200 ease-out focus-visible:outline-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        primary:
          'bg-led-green text-void shadow-[0_0_2.5em_-0.8em_var(--color-led-green)] hover:brightness-110 hover:shadow-[0_0_3em_-0.5em_var(--color-led-green)]',
        amber:
          'bg-led-amber text-void shadow-[0_0_2.5em_-0.8em_var(--color-led-amber)] hover:brightness-110 hover:shadow-[0_0_3em_-0.5em_var(--color-led-amber)]',
        ghost:
          'border border-seam bg-transparent text-steel hover:border-steel-dim hover:text-bone',
      },
      size: {
        lg: 'h-14 px-9 text-base',
        md: 'h-11 px-6 text-sm',
        sm: 'h-9 px-4 text-xs',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof button> {}

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(button({ variant, size }), className)} {...props} />;
}
