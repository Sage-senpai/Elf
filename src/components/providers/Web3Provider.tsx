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
  }
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
