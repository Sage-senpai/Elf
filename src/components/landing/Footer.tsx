import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const product = [
  { label: "How it works", href: "#how" },
  { label: "Use cases", href: "#use-cases" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" }
];

const company = [
  { label: "Sign in", href: "/sign-in" },
  { label: "Contact", href: "mailto:hello@elf.so" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" }
];

export function Footer() {
  return (
    <footer className="px-6 py-16 border-t border-hair">
      <div className="mx-auto max-w-shell">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo size={28} />
            <p className="mt-4 text-sm text-elf-muted leading-relaxed max-w-xs">
              The cross-functional builder workspace. Devs commit code,
              writers add words, managers stay in control — without anyone
              switching apps.
            </p>
          </div>

          <FooterCol title="product" items={product} />
          <FooterCol title="company" items={company} />
        </div>

        {/* Sleeping elf — the SVG includes the "leave it to elf." tagline,
            so the bottom row stays minimal to avoid duplicating it. */}
        <div className="flex justify-center mt-16 mb-6">
          <img
            src="/illustrations/footer-sleeping-elf.svg"
            alt=""
            width={300}
            height={150}
            loading="lazy"
          />
        </div>

        <div className="mt-2 pt-6 border-t border-hair flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-xs text-elf-muted">
            © {new Date().getFullYear()} elf.
          </p>
          <p className="mono text-xs text-elf-muted">
            Built in the open.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  items
}: {
  title: string;
  items: Array<{ label: string; href: string }>;
}) {
  return (
    <div>
      <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-4">
        {title}
      </p>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-sm text-elf-ink hover:text-elf-deep transition-colors"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
