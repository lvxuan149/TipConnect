'use client';

import { ReactNode } from "react";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { WalletProvider } from "@/components/context/WalletContext";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const environmentId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;

  if (!environmentId) {
    console.error('Dynamic Environment ID is missing!');
    return <div>Error: Dynamic Environment ID not configured</div>;
  }

  console.log('Dynamic Environment ID:', environmentId);

  return (
    <DynamicContextProvider
      settings={{
        environmentId,
        walletConnectors: [SolanaWalletConnectors],
      }}
    >
      <WalletProvider>{children}</WalletProvider>
    </DynamicContextProvider>
  );
}