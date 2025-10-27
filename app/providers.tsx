'use client';

import type { ReactNode } from "react";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { WalletProvider } from "@/components/context/WalletContext";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: process.env.DYNAMIC_ENV_ID!,
        walletConnectors: [SolanaWalletConnectors]
      }}
    >
      <WalletProvider>{children}</WalletProvider>
    </DynamicContextProvider>
  );
}
