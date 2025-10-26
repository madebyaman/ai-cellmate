import * as React from "react";
import { cn } from "~/utils/misc";

export interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

const Logo = React.forwardRef<SVGSVGElement, LogoProps>(
  ({ className, size = 24, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("fill-primary-600", className)}
        {...props}
      >
        {/* Top-left quadrant */}
        <rect x="2" y="2" width="9.5" height="9.5" rx="2.5" />

        {/* Top-right quadrant */}
        <rect x="13.5" y="2" width="9.5" height="9.5" rx="2.5" />

        {/* Bottom-left quadrant */}
        <rect x="2" y="13.5" width="9.5" height="9.5" rx="2.5" />

        {/* Bottom-right quadrant */}
        <rect x="13.5" y="13.5" width="9.5" height="9.5" rx="2.5" />
      </svg>
    );
  },
);

Logo.displayName = "Logo";

export { Logo };
