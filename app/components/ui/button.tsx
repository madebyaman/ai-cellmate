import { Loader2 } from "lucide-react";
import * as React from "react";
import { cn } from "~/utils/misc";

const getVariantClasses = (variant: string = "default") => {
  const variants = {
    default:
      "bg-gradient-to-br from-primary-600 to-primary-700 text-white ring-primary-400",
    destructive: "bg-red-50 text-red-600 hover:bg-red-100 ring-red-400",
    outline: "border border-slate-300 bg-white hover:bg-slate-50 ring-gray-400",
    secondary:
      "bg-gradient-to-br from-gray-800 to-gray-900 text-white ring-gray-400",
    ghost:
      "hover:bg-primary hover:text-accent-foreground border-none shadow-none",
    link: "text-primary-500 underline underline-offset-4 hover:no-underline border-none shadow-none",
    icon: "border rounded-full border-slate-300 text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300",
  };
  return variants[variant as keyof typeof variants] || variants.default;
};

const getSizeClasses = (size: string = "default") => {
  const sizes = {
    default: "h-10 px-5 py-2.5",
    wide: "px-24 py-5",
    full: "w-full py-2 px-4",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    pill: "px-12 py-3 leading-3",
    icon: "h-10 w-10",
  };
  return sizes[size as keyof typeof sizes] || sizes.default;
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "icon";
  size?: "default" | "wide" | "full" | "sm" | "lg" | "pill" | "icon";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      children,
      isLoading,
      ...props
    },
    ref,
  ) => {
    const baseClasses =
      "inline-flex items-center gap-2 justify-center rounded-md text-sm font-medium shadow-sm transition-all duration-200 hover:shadow outline-none focus-visible:ring-2 focus-within:ring-2 ring-primary-400 ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer";

    return (
      <button
        className={cn(
          baseClasses,
          getVariantClasses(variant),
          getSizeClasses(size),
          className,
        )}
        disabled={isLoading || props.disabled}
        ref={ref}
        {...props}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button };
