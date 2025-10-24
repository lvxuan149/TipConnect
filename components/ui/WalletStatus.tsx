'use client';
import { useWallet } from "@/components/context/WalletContext";
import { Button } from "@/components/ui/GlowCard";

export function WalletStatus() {
  const { walletConnected, walletAddress, connect, disconnect } = useWallet();

  if (!walletConnected) {
    return <Button onClick={connect}>Connect Wallet</Button>;
  }

  return (
    <div className="relative group">
      <button className="btn btn-primary opacity-90">{walletAddress}</button>
      <div className="absolute right-0 mt-2 hidden group-hover:block bg-panel border border-white/10 rounded-xl3 p-3 text-sm shadow-soft">
        <a href="/story/create" className="block px-3 py-1 hover:opacity-80">Create Story</a>
        <a href="/blinks/create" className="block px-3 py-1 hover:opacity-80">Create Blink</a>
        <a href="/story/mine" className="block px-3 py-1 hover:opacity-80">My Story</a>
        <button onClick={disconnect} className="block px-3 py-1 text-red-400 hover:opacity-80">Disconnect</button>
      </div>
    </div>
  );
}