import { cn } from "@/lib/cn";

type Variant = "light" | "dark" | "icon" | "stacked";

type Props = {
  variant?: Variant;
  size?: number;
  className?: string;
};

/**
 * Elf logomark — E built from horizontal shelf bars inside a rounded square.
 * Spec section 2.3: #0F6E56 fill, #9FE1CB bars.
 */
export function Logo({ variant = "light", size = 32, className }: Props) {
  if (variant === "stacked") {
    return (
      <div className={cn("inline-flex flex-col items-center gap-2", className)}>
        <Mark size={size} />
        <span className="wordmark text-elf-forest" style={{ fontSize: size * 0.85 }}>
          elf
        </span>
      </div>
    );
  }

  if (variant === "icon") {
    return <Mark size={size} className={className} />;
  }

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <Mark size={size} />
      <span
        className={cn(
          "wordmark leading-none",
          variant === "dark" ? "text-elf-mint" : "text-elf-forest"
        )}
        style={{ fontSize: size * 0.85 }}
      >
        elf
      </span>
    </div>
  );
}

function Mark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="elf"
      className={className}
    >
      <rect width="32" height="32" rx="8" fill="#0F6E56" />
      {/* three shelf bars forming an E */}
      <rect x="7" y="8" width="18" height="3" rx="1" fill="#9FE1CB" />
      <rect x="7" y="14.5" width="13" height="3" rx="1" fill="#9FE1CB" />
      <rect x="7" y="21" width="18" height="3" rx="1" fill="#9FE1CB" />
    </svg>
  );
}
