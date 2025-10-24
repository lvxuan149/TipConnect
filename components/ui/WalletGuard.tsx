'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/GlowCard';

/**
 * WalletGuard 组件
 * - 未连接钱包时：显示"Connect Wallet"提示 + 连接按钮
 * - 已连接钱包时：执行真正的点击逻辑（onBlink）
 */
export function WalletGuard({
  walletConnected = false,
  onConnect,
  onBlink,
  actionLabel = "Blink"
}: {
  walletConnected?: boolean;
  onConnect?: () => void;
  onBlink?: () => void;
  actionLabel?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!walletConnected) {
      onConnect?.();
      return;
    }
    setLoading(true);
    try {
      await onBlink?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Button
        onClick={handleClick}
        className="w-full justify-center"
      >
        {loading ? "Processing..." : walletConnected ? actionLabel : "Connect Wallet"}
      </Button>
      {!walletConnected && (
        <p className="text-xs text-white/60 mt-2 text-center">
          Please connect your wallet to perform this action.
        </p>
      )}
    </div>
  );
}