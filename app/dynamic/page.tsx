'use client';

import { DynamicWidget } from "@dynamic-labs/sdk-react-core";

export default function DynamicPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <h1 className="mb-4 text-xl font-bold">Dynamic Sandbox Login</h1>
      <DynamicWidget />
    </div>
  );
}
