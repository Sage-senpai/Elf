import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";

type CommonProps = {
  variant?: Variant;
  size?: "md" | "lg";
  className?: string;
  children: React.ReactNode;
};

type ButtonProps = CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type LinkProps = CommonProps & { href: string };

const base =
  "inline-flex items-center justify-center rounded-button transition-colors duration-150 select-none";
const sizes = {
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base"
};
const variants: Record<Variant, string> = {
  primary:
    "bg-elf-deep text-elf-on-brand hover:bg-elf-forest focus:outline-none focus-visible:ring-2 focus-visible:ring-elf-mint",
  secondary:
    "border-hair text-elf-ink bg-transparent hover:bg-elf-warm-white focus:outline-none focus-visible:ring-2 focus-visible:ring-elf-mint",
  ghost:
    "text-elf-ink hover:text-elf-deep focus:outline-none focus-visible:underline"
};

export function Button(props: ButtonProps | LinkProps) {
  const { variant = "primary", size = "md", className, children } = props;
  const classes = cn(base, sizes[size], variants[variant], className);

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    );
  }

  const { variant: _v, size: _s, className: _c, children: _ch, ...rest } = props as ButtonProps;
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
