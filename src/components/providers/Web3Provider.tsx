"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { base, baseSepolia, mainnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

const config = createConfig({
  chains: [base, baseSepolia, mainnet],
  connectors: [injected()],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [mainnet.id]: http()
  },
  // ssr: true tells wagmi to defer storage rehydration to the client,
  // which eliminates the hydration mismatches that surfaced as React
  // #418/#423 in production. Keeps the provider tree intact so wagmi
  // hooks (used in WalletConnector) keep working on first render.
  ssr: true
});

export function Web3Provider({ children }: { children: React.ReactNode }) {
  // QueryClient instantiated inside component so Next.js doesn't reuse
  // the same client across server requests.
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
