"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; txHash?: string }
  | { kind: "error"; message: string };

export function PayContributorForm({
  codename,
  slug,
  treasuryAddress
}: {
  codename: string;
  slug: string;
  treasuryAddress: string;
}) {
  const router = useRouter();
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientUserId, setRecipientUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "submitting" });

    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setStatus({ kind: "error", message: "Amount must be a positive number." });
      return;
    }

    try {
      const res = await fetch(
        `/api/workspaces/${codename}/projects/${slug}/treasury/pay`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            recipientAddress,
            recipientUserId,
            amountUsdc: amountNumber
          })
        }
      );
      const json = (await res.json()) as { txHash?: string; message?: string };
      if (!res.ok) {
        setStatus({ kind: "error", message: json.message ?? "Payment failed." });
        return;
      }
      setStatus({ kind: "success", txHash: json.txHash });
      setRecipientAddress("");
      setRecipientUserId("");
      setAmount("");
      router.refresh();
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error."
      });
    }
  }

  return (
    <div className="border-hair rounded-card p-7 md:p-8">
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <p className="mono text-xs uppercase tracking-widest text-elf-mid mb-1">
            pay a contributor
          </p>
          <h2 className="text-lg text-elf-forest">Send USDC from this treasury.</h2>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <Field
          label="Recipient wallet"
          value={recipientAddress}
          onChange={setRecipientAddress}
          placeholder="0x…"
          mono
          required
          hint="The contributor's wallet address. They'll receive USDC on the same chain."
        />
        <Field
          label="Recipient user id"
          value={recipientUserId}
          onChange={setRecipientUserId}
          placeholder="UUID from your contributor list"
          mono
          required
          hint="Links the payment to the contributor's profile in this workspace."
        />
        <Field
          label="Amount (USDC)"
          value={amount}
          onChange={setAmount}
          placeholder="50"
          type="number"
          required
          hint="Net amount the contributor receives. Network gas is paid separately by the treasury."
        />

        {status.kind === "error" && (
          <p className="text-sm text-red-700 border-hair rounded-input p-3 bg-red-50">
            {status.message}
          </p>
        )}
        {status.kind === "success" && (
          <p className="text-sm text-elf-forest border-hair rounded-input p-3 bg-elf-mint/30">
            Sent ✓
            {status.txHash && (
              <span className="block mono text-xs text-elf-muted mt-1 break-all">
                tx: {status.txHash}
              </span>
            )}
          </p>
        )}

        <Button
          type="submit"
          size="md"
          className="w-full"
          disabled={status.kind === "submitting"}
        >
          {status.kind === "submitting" ? "Sending…" : "Send payment"}
        </Button>

        <p className="mono text-[11px] text-elf-muted">
          from {treasuryAddress.slice(0, 10)}…{treasuryAddress.slice(-6)}
        </p>
      </form>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  type?: "text" | "number";
  required?: boolean;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="mono text-xs uppercase tracking-widest text-elf-muted">
        {props.label}
      </span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        required={props.required}
        autoComplete="off"
        step={props.type === "number" ? "0.01" : undefined}
        className={`mt-2 w-full h-12 px-4 rounded-input border-hair bg-elf-warm-white text-elf-ink placeholder:text-elf-muted/60 focus:outline-none focus:border-elf-deep ${
          props.mono ? "mono text-sm" : ""
        }`}
      />
      {props.hint && (
        <span className="mt-1.5 block text-xs text-elf-muted">{props.hint}</span>
      )}
    </label>
  );
}
