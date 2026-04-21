import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createServiceClient } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;
    const questionId = formData.get("question_id") as string | null;

    if (!imageFile) return NextResponse.json({ error: "No image provided" }, { status: 400 });
    if (!["image/png", "image/jpeg", "image/webp"].includes(imageFile.type))
      return NextResponse.json({ error: "Only PNG, JPEG, WEBP allowed" }, { status: 400 });
    if (imageFile.size > 5 * 1024 * 1024)
      return NextResponse.json({ error: "Image too large (max 5 MB)" }, { status: 400 });

    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const ext = imageFile.type.split("/")[1];
    const filename = `${user.id}/${uuidv4()}.${ext}`;

    const db = createServiceClient();
    const { data, error } = await db.storage.from("diagrams").upload(filename, buffer, {
      contentType: imageFile.type, upsert: false,
    });
    if (error) throw new Error(error.message);

    const { data: urlData } = db.storage.from("diagrams").getPublicUrl(data.path);
    if (questionId) await db.from("questions").update({ diagram_url: urlData.publicUrl }).eq("id", questionId);
    return NextResponse.json({ url: urlData.publicUrl, path: data.path });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
