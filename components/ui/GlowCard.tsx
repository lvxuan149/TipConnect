'use client';

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function GlowCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={`card ring-1 ring-white/5 hover:ring-brand/30 transition ${className}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export function Section({ title, desc, children }: { title: string; desc?: string; children?: ReactNode }) {
  return (
    <section className="mx-auto max-w-5xl px-6">
      <header className="mb-6">
        <h1 className="section-title">{title}</h1>
        {desc && <p className="section-desc mt-1">{desc}</p>}
      </header>
      {children}
    </section>
  );
}

export function Button({
  children,
  href,
  onClick,
  className = ""
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const content = (
    <motion.span
      className={`btn btn-primary ${className}`}
      whileHover={{ y: -2 }}
      whileTap={{ y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.span>
  );
  return href ? (
    <a href={href} className="inline-flex">
      {content}
    </a>
  ) : (
    <button type="button" onClick={onClick} className="inline-flex">
      {content}
    </button>
  );
}
