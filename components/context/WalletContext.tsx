'use client';
import { createContext, useContext, ReactNode } from "react";
import { useDynamicContext, useIsLoggedIn, useUserWallets } from "@dynamic-labs/sdk-react-core";

interface WalletContextType {
  walletConnected: boolean;
  walletAddress: string | null;
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { setShowAuthFlow, handleLogOut } = useDynamicContext();
  const isLoggedIn = useIsLoggedIn();
  const userWallets = useUserWallets();

  const walletConnected = isLoggedIn && userWallets.length > 0;
  const walletAddress = userWallets.length > 0 ?
    `${userWallets[0].address.slice(0, 6)}...${userWallets[0].address.slice(-4)}` : null;

  const connect = () => {
    setShowAuthFlow(true);
  };

  const disconnect = () => {
    handleLogOut();
  };

  return (
    <WalletContext.Provider value={{ walletConnected, walletAddress, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet() must be used inside <WalletProvider>");
  return ctx;
}