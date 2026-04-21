import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const db = createServiceClient();

  const { data: test, error } = await db.from("tests").select("*, questions(*)").eq("slug", params.slug).single();
  if (error || !test) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!test.is_public && test.clerk_user_id !== user?.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (test.questions) test.questions.sort((a: any, b: any) => a.question_number - b.question_number);
  return NextResponse.json(test);
}
