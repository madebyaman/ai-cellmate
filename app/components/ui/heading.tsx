import { cn } from "~/utils/misc";

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export default function Heading({ as, children, className }: HeadingProps) {
  const Tag = as || "h1";

  const headingSizes = {
    h1: "text-2xl sm:text-4xl md:text-5xl",
    h2: "text-xl sm:text-2xl md:text-3xl",
    h3: "text-lg sm:text-xl",
    h4: "text-lg sm:text-xl",
    h5: "text-base",
    h6: "text-sm",
  };

  return (
    <Tag
      className={cn(
        "font-semibold text-neutral-900 text-balance tracking-normal leading-snug",
        headingSizes[Tag],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
