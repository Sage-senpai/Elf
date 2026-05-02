import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Logo } from "@/components/brand/Logo";
import { HeaderActions } from "@/components/auth/HeaderActions";
import { McpKeysPanel } from "@/components/mcp/McpKeysPanel";
import { requireSession } from "@/lib/auth/session";
import {
  findWorkspaceByCodename,
  getUserRole
} from "@/db/repositories/workspaces";
import { listMcpKeys } from "@/db/repositories/mcp";

type Props = { params: { codename: string } };

export async function generateMetadata({ params }: Props) {
  return { title: `MCP — ${params.codename}` };
}

export default async function McpPage({ params }: Props) {
  const session = await requireSession();
  const workspace = await findWorkspaceByCodename(params.codename);
  if (!workspace) notFound();

  const role = await getUserRole(workspace.id, session.user.id);
  if (!role) notFound();

  const keys =
    role === "manager" ? await listMcpKeys(workspace.id) : [];

  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const origin = host ? `${proto}://${host}` : "";

  return (
    <main className="min-h-screen">
      <header className="px-6 py-5 border-b border-hair">
        <div className="mx-auto max-w-shell flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3" aria-label="elf">
            <Logo size={28} />
            <span className="text-elf-border">/</span>
            <Link
              href={`/workspaces/${workspace.codename}`}
              className="mono text-sm text-elf-ink hover:text-elf-deep"
            >
              {workspace.codename}
            </Link>
            <span className="text-elf-border">/</span>
            <span className="mono text-sm text-elf-mid">mcp</span>
          </Link>
          <HeaderActions
            user={{
              name: session.user.name,
              email: session.user.email,
              image: session.user.image
            }}
          />
        </div>
      </header>

      <section className="px-6 py-12">
        <div className="mx-auto max-w-shell space-y-8">
          <div>
            <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-3">
              model context protocol
            </p>
            <h1 className="display text-3xl md:text-4xl text-elf-forest leading-tight mb-2">
              Connect Elf as an MCP server
            </h1>
            <p className="text-base text-elf-muted max-w-prose leading-relaxed">
              Plug Cursor, Claude Desktop, or any MCP-compatible client into
              this workspace. Tools query your live projects and commits — no
              copy-paste, no scraping. Read-only today; write tools land
              alongside agent-paid execution.
            </p>
          </div>

          {role === "manager" ? (
            <McpKeysPanel
              codename={workspace.codename}
              initialKeys={keys.map((k) => ({
                id: k.id,
                name: k.name,
                lastUsedAt: k.lastUsedAt,
                createdAt: k.createdAt
              }))}
              origin={origin}
            />
          ) : (
            <p className="text-sm text-elf-muted border-hair rounded-card p-5">
              Only managers can issue MCP keys. Ask a manager if you want to
              connect a client.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
