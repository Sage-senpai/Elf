/**
 * ExecutionProvider — guaranteed on-chain execution with retries + audit.
 *
 * Real impl: KeeperHubProvider (REST + MCP). KeeperHub has no published npm
 * SDK yet — endpoints to confirm via the hackathon Discord.
 *
 * Mock impl: ImmediateExecutionProvider runs the steps inline so feature work
 * isn't blocked while the real KeeperHub API is being wired.
 *
 * Spec rule: every executed action must be IDEMPOTENT at the application
 * layer (KeeperHub may retry).
 */

export type WorkflowStep = {
  action: "http.post" | "http.get" | "http.patch" | "http.delete";
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
};

export type WorkflowConfig = {
  name: string;
  trigger: "manual" | "schedule";
  steps: WorkflowStep[];
  retries?: number;
  backoff?: "linear" | "exponential";
};

export type TaskStatus = {
  status: "pending" | "executing" | "settled" | "failed";
  txHash?: string;
  retries: number;
  error?: string;
};

export interface ExecutionProvider {
  readonly kind: "keeperhub" | "immediate";
  createWorkflow(config: WorkflowConfig): Promise<{ workflowId: string }>;
  runWorkflow(workflowId: string): Promise<{ taskId: string }>;
  getTaskStatus(taskId: string): Promise<TaskStatus>;
}

class KeeperHubProvider implements ExecutionProvider {
  readonly kind = "keeperhub" as const;

  constructor(
    private readonly apiUrl = process.env.KEEPERHUB_API_URL ?? "https://api.keeperhub.com",
    private readonly apiKey = process.env.KEEPERHUB_API_KEY ?? ""
  ) {}

  async createWorkflow(_config: WorkflowConfig): Promise<{ workflowId: string }> {
    if (!this.apiKey) throw new Error("KEEPERHUB_API_KEY not set.");
    // TODO: POST `${apiUrl}/workflows` once KeeperHub publishes endpoint shape
    throw new Error("KeeperHubProvider.createWorkflow not yet wired.");
  }

  async runWorkflow(_workflowId: string): Promise<{ taskId: string }> {
    throw new Error("KeeperHubProvider.runWorkflow not yet wired.");
  }

  async getTaskStatus(_taskId: string): Promise<TaskStatus> {
    throw new Error("KeeperHubProvider.getTaskStatus not yet wired.");
  }
}

/**
 * Mock provider — runs steps inline using fetch. Lets fork-approval flows be
 * end-to-end testable before KeeperHub is wired. NOT a fallback for prod use.
 */
class ImmediateExecutionProvider implements ExecutionProvider {
  readonly kind = "immediate" as const;
  private workflows = new Map<string, WorkflowConfig>();
  private tasks = new Map<string, TaskStatus>();

  async createWorkflow(config: WorkflowConfig): Promise<{ workflowId: string }> {
    const workflowId = `mock_wf_${crypto.randomUUID()}`;
    this.workflows.set(workflowId, config);
    return { workflowId };
  }

  async runWorkflow(workflowId: string): Promise<{ taskId: string }> {
    const config = this.workflows.get(workflowId);
    if (!config) throw new Error(`Unknown workflow: ${workflowId}`);
    const taskId = `mock_task_${crypto.randomUUID()}`;
    this.tasks.set(taskId, { status: "executing", retries: 0 });

    // Fire-and-forget execution.
    void (async () => {
      try {
        for (const step of config.steps) {
          await fetch(step.url, {
            method: step.action.split(".")[1].toUpperCase(),
            headers: step.headers,
            body: step.body !== undefined ? JSON.stringify(step.body) : undefined
          });
        }
        this.tasks.set(taskId, { status: "settled", retries: 0 });
      } catch (err) {
        this.tasks.set(taskId, {
          status: "failed",
          retries: 0,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    })();

    return { taskId };
  }

  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    return this.tasks.get(taskId) ?? { status: "pending", retries: 0 };
  }
}

export function getExecutionProvider(): ExecutionProvider {
  return process.env.KEEPERHUB_API_KEY
    ? new KeeperHubProvider()
    : new ImmediateExecutionProvider();
}
