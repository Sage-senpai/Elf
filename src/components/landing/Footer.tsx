import { Logo } from "@/components/brand/Logo";

export function Footer() {
  return (
    <footer className="px-6 py-12 border-t border-hair">
      <div className="mx-auto max-w-shell flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <Logo size={24} />
          <span className="text-sm text-elf-muted">
            Leave it to elf. © 2026
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm text-elf-muted">
          <a href="mailto:hello@elf.so" className="hover:text-elf-deep">
            hello@elf.so
          </a>
          <a
            href="https://ethglobal.com/events/openagents"
            target="_blank"
            rel="noreferrer"
            className="hover:text-elf-deep"
          >
            ETHGlobal OpenAgents 2026
          </a>
        </div>
      </div>
    </footer>
  );
}
