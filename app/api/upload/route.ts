// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";

export const runtime = "nodejs"; // 确保使用 Node runtime

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const key = `uploads/${Date.now()}_${file.name}`;
    const contentType = file.type || "application/octet-stream";

    const publicUrl = await uploadToR2(key, buffer, contentType);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      key,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Upload failed", detail: String(err) },
      { status: 500 }
    );
  }
}