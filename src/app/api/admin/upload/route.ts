import { NextResponse } from "next/server";
import { getSessionUser, isStaff } from "@/lib/auth";
import { saveUploadedImage } from "@/lib/uploads";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!isStaff(user)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file received." }, { status: 400 });
    }
    const asset = await saveUploadedImage(file);
    return NextResponse.json({ url: asset.url, id: asset.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
