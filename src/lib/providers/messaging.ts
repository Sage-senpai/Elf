/**
 * MessagingProvider — encrypted P2P routing for Cowork sessions.
 *
 * Real impl: AxlBinaryMessagingProvider — spawns Gensyn AXL as a child
 * process and talks to its localhost HTTP API. Linux/macOS/WSL2 only;
 * the Windows binary isn't shipped, so we mock on bare Windows.
 *
 * Mock impl: InProcessMessagingProvider — passes messages through a Map.
 * Lets multi-party Cowork code run on Windows without WSL2.
 *
 * Switch via AXL_TRANSPORT=mock|binary in .env.
 */

export type PeerId = string;

export type CoworkPayload = {
  sessionId: string;
  from: PeerId;
  message: string;
  metadata?: Record<string, unknown>;
};

export interface MessagingProvider {
  readonly kind: "axl" | "in-process";
  /** Spin up a node and return its peer id + local port. */
  startNode(sessionId: string): Promise<{ peerId: PeerId; port: number }>;
  /** Tear down a node when a Cowork session closes. */
  stopNode(sessionId: string): Promise<void>;
  /** Deliver a payload from one peer to another over the mesh. */
  send(toPeer: PeerId, payload: CoworkPayload): Promise<void>;
  /** Subscribe to inbound payloads for a peer. Returns an unsubscribe fn. */
  onMessage(forPeer: PeerId, handler: (payload: CoworkPayload) => void): () => void;
}

/* -------------------------------------------------------------------------- */
/*  In-process mock — Windows-friendly. Single-process delivery.              */
/* -------------------------------------------------------------------------- */
class InProcessMessagingProvider implements MessagingProvider {
  readonly kind = "in-process" as const;
  private nodes = new Map<string, { peerId: PeerId; port: number }>();
  private listeners = new Map<PeerId, Set<(p: CoworkPayload) => void>>();
  private nextPort = Number(process.env.AXL_BASE_PORT ?? 9000);

  async startNode(sessionId: string): Promise<{ peerId: PeerId; port: number }> {
    const existing = this.nodes.get(sessionId);
    if (existing) return existing;
    const node = {
      peerId: `mock_peer_${crypto.randomUUID().slice(0, 8)}`,
      port: this.nextPort++
    };
    this.nodes.set(sessionId, node);
    return node;
  }

  async stopNode(sessionId: string): Promise<void> {
    const node = this.nodes.get(sessionId);
    if (node) this.listeners.delete(node.peerId);
    this.nodes.delete(sessionId);
  }

  async send(toPeer: PeerId, payload: CoworkPayload): Promise<void> {
    const handlers = this.listeners.get(toPeer);
    if (!handlers) return;
    for (const h of handlers) h(payload);
  }

  onMessage(forPeer: PeerId, handler: (payload: CoworkPayload) => void): () => void {
    const set = this.listeners.get(forPeer) ?? new Set();
    set.add(handler);
    this.listeners.set(forPeer, set);
    return () => set.delete(handler);
  }
}

/* -------------------------------------------------------------------------- */
/*  Real AXL binary — Linux/macOS/WSL2.                                       */
/* -------------------------------------------------------------------------- */
class AxlBinaryMessagingProvider implements MessagingProvider {
  readonly kind = "axl" as const;

  async startNode(_sessionId: string): Promise<{ peerId: PeerId; port: number }> {
    // TODO: spawn AXL_BINARY_PATH with --port + AXL_CONFIG_PATH, parse peer_id from stdout.
    throw new Error("AxlBinaryMessagingProvider.startNode not yet wired (sprint week 5).");
  }

  async stopNode(_sessionId: string): Promise<void> {
    throw new Error("AxlBinaryMessagingProvider.stopNode not yet wired.");
  }

  async send(_toPeer: PeerId, _payload: CoworkPayload): Promise<void> {
    throw new Error("AxlBinaryMessagingProvider.send not yet wired.");
  }

  onMessage(): () => void {
    throw new Error("AxlBinaryMessagingProvider.onMessage not yet wired.");
  }
}

let singleton: MessagingProvider | null = null;
export function getMessagingProvider(): MessagingProvider {
  if (singleton) return singleton;
  const transport = (process.env.AXL_TRANSPORT ?? "mock").toLowerCase();
  singleton = transport === "binary"
    ? new AxlBinaryMessagingProvider()
    : new InProcessMessagingProvider();
  return singleton;
}
