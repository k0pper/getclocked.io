import { cva, type VariantProps } from 'class-variance-authority';
import { motion, type HTMLMotionProps } from 'motion/react';
import { cn } from '@/lib/utils';

/**
 * Physical, three-dimensional keys. The solid variants sit on a coloured "base"
 * (a stacked solid drop-shadow in the dim shade) with a bright top bevel. The
 * press is a real animation, not a CSS snap: `whileTap` eases the cap down while
 * the base shadow shrinks to meet it, so the key travels into its socket.
 */
const button = cva(
  'relative inline-flex select-none items-center justify-center gap-2 rounded-2xl font-sans font-semibold uppercase tracking-[0.12em] transition-[box-shadow,filter,color,background-color,border-color] duration-150 ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 disabled:saturate-50',
  {
    variants: {
      variant: {
        primary:
          'bg-led-green text-void [text-shadow:0_1px_0_color-mix(in_oklab,var(--color-led-green)_60%,white)] shadow-[0_5px_0_0_var(--color-led-green-dim),0_9px_14px_-4px_rgba(0,0,0,0.7),inset_0_2px_0_0_rgba(255,255,255,0.5),inset_0_-3px_6px_-2px_rgba(0,0,0,0.35),0_0_3em_-1em_var(--color-led-green)] hover:brightness-[1.06] active:shadow-[0_1px_0_0_var(--color-led-green-dim),0_2px_5px_-2px_rgba(0,0,0,0.7),inset_0_2px_0_0_rgba(255,255,255,0.4),inset_0_-2px_5px_-2px_rgba(0,0,0,0.4)]',
        amber:
          'bg-led-amber text-void [text-shadow:0_1px_0_color-mix(in_oklab,var(--color-led-amber)_60%,white)] shadow-[0_5px_0_0_var(--color-led-amber-dim),0_9px_14px_-4px_rgba(0,0,0,0.7),inset_0_2px_0_0_rgba(255,255,255,0.55),inset_0_-3px_6px_-2px_rgba(0,0,0,0.35),0_0_3em_-1em_var(--color-led-amber)] hover:brightness-[1.06] active:shadow-[0_1px_0_0_var(--color-led-amber-dim),0_2px_5px_-2px_rgba(0,0,0,0.7),inset_0_2px_0_0_rgba(255,255,255,0.45),inset_0_-2px_5px_-2px_rgba(0,0,0,0.4)]',
        ghost:
          'border border-seam bg-void-raised text-steel shadow-[0_3px_0_0_var(--color-void-deep),0_6px_10px_-4px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:border-steel-dim hover:text-bone active:shadow-[0_1px_0_0_var(--color-void-deep),inset_0_1px_0_0_rgba(255,255,255,0.05)]',
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
  extends Omit<HTMLMotionProps<'button'>, 'ref'>,
    VariantProps<typeof button> {}

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return (
    <motion.button
      type={type}
      className={cn(button({ variant, size }), className)}
      // The cap eases down ~4px on press and back on release — a push, not a
      // jump. Disabled keys don't move.
      whileTap={props.disabled ? undefined : { y: 4 }}
      transition={{ duration: 0.12, ease: [0.2, 0.7, 0.3, 1] }}
      {...props}
    />
  );
}
