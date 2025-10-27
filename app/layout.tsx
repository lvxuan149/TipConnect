import "./globals.css";
import { Providers } from "./providers";
import { WalletStatus } from "@/components/ui/WalletStatus";

export const metadata = {
  title: "TipConnect",
  description: "Web3 Gratitude Social Protocol on Solana"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-dark03 text-white">
        <Providers>
          <header className="sticky top-0 z-10 border-b border-white/10 bg-dark09/60 backdrop-blur">
            <div className="mx-auto flex max-w-5xl items-center justify-between py-4 px-6">
              <a href="/" className="font-semibold">TipConnect</a>
              <nav className="flex items-center gap-6 text-sm">
                <a className="hover:opacity-80" href="/discover">Discover</a>
                <a className="hover:opacity-80" href="/creators">Creators</a>
                <WalletStatus />
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-6 pb-16 pt-10">{children}</main>
          <footer className="mx-auto max-w-5xl p-4 text-xs text-white/60">© TipConnect</footer>
        </Providers>
      </body>
    </html>
  );
}
