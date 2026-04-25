import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { requireSession } from "@/lib/auth/session";
import { CreateWorkspaceForm } from "./CreateWorkspaceForm";

export const metadata = {
  title: "New workspace — elf"
};

export default async function NewWorkspacePage() {
  await requireSession();

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-5 border-b border-hair">
        <Link href="/dashboard" className="inline-flex items-center" aria-label="elf home">
          <Logo size={28} />
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg">
          <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
            new workspace
          </p>
          <h1 className="display text-3xl text-elf-forest leading-tight mb-2">
            Create your workspace.
          </h1>
          <p className="text-sm text-elf-muted mb-10">
            Workspaces are where projects, contributors, and commits live.
            Most people start with one and add more as they grow.
          </p>

          <CreateWorkspaceForm />
        </div>
      </div>
    </main>
  );
}
