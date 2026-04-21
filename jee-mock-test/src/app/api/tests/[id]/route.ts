import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const db = createServiceClient();

  const { data: test, error } = await db.from("tests").select("*, questions(*)").eq("id", params.id).single();
  if (error || !test) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!test.is_public && test.clerk_user_id !== user?.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (test.questions) test.questions.sort((a: any, b: any) => a.question_number - b.question_number);
  return NextResponse.json(test);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();
  const { data: existing } = await db.from("tests").select("clerk_user_id").eq("id", params.id).single();
  if (!existing || existing.clerk_user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const allowed = ["title", "description", "is_public", "duration_mins", "difficulty"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) { if (key in body) updates[key] = body[key]; }

  const { data, error } = await db.from("tests").update(updates).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();
  const { data: existing } = await db.from("tests").select("clerk_user_id").eq("id", params.id).single();
  if (!existing || existing.clerk_user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await db.from("tests").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
