import UploadWidget from "@/components/UploadWidget";

export default function UploadPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Cloudflare R2 Upload Test</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Upload File to R2</h2>
        <UploadWidget />
      </div>

      <div className="mt-6 text-sm text-gray-600">
        <p>This page tests the Cloudflare R2 integration.</p>
        <p>Upload a file to see if it works correctly.</p>
      </div>
    </div>
  );
}