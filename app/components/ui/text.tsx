import { cn } from "~/utils/misc";

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  className?: string;
}

export default function Text({ children, className, ...rest }: TextProps) {
  return (
    <p
      className={cn(
        "text-gray-600 text-base leading-7 sm:text-lg sm:leading-8",
        className,
      )}
      {...rest}
    >
      {children}
    </p>
  );
}
