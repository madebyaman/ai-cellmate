import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '~/utils/misc';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium shadow-sm transition-colors outline-none focus-visible:ring-2 focus-within:ring-2 ring-indigo-400 ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-indigo-600 text-white hover:bg-indigo-700',
        destructive: 'bg-red-50 text-red-600 hover:bg-red-100 ring-red-400',
        outline: 'border border-slate-300 bg-white hover:bg-slate-50',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost:
          'hover:bg-primary hover:text-accent-foreground border-none shadow-none',
        link: 'text-indigo-500 underline underline-offset-4 hover:no-underline border-none shadow-none',
        icon: 'border rounded-full border-slate-300 text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300',
      },
      size: {
        default: 'h-10 px-4 py-2',
        wide: 'px-24 py-5',
        full: 'w-full py-2 px-4',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        pill: 'px-12 py-3 leading-3',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
