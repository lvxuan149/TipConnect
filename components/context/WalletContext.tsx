'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface WalletContextType {
  walletConnected: boolean;
  walletAddress: string | null;
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletConnected, setConnected] = useState(false);
  const [walletAddress, setAddress] = useState<string | null>(null);

  // 模拟加载缓存（未来可替换为 Phantom adapter）
  useEffect(() => {
    const cached = localStorage.getItem("walletConnected");
    if (cached === "true") {
      setConnected(true);
      setAddress("demoUser.sol");
    }
  }, []);

  const connect = () => {
    setConnected(true);
    setAddress("demoUser.sol"); // 模拟钱包地址
    localStorage.setItem("walletConnected", "true");
  };

  const disconnect = () => {
    setConnected(false);
    setAddress(null);
    localStorage.removeItem("walletConnected");
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