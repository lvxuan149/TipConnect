"use client";

import { useState } from "react";

export default function UploadWidget() {
  const [url, setUrl] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setUrl(data.url);
  }

  return (
    <div className="space-y-3">
      <input type="file" onChange={handleUpload} />
      {url && (
        <a href={url} target="_blank" rel="noopener" className="text-blue-500 underline">
          查看已上传文件
        </a>
      )}
    </div>
  );
}