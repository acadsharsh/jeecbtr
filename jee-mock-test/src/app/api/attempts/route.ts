import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createServiceClient } from "@/lib/supabase";
import { calculateScore } from "@/lib/utils";
import type { Question } from "@/types";

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action, test_id, attempt_id, answers, time_taken_secs } = body;
  const db = createServiceClient();

  if (action === "start") {
    const { data: existing } = await db.from("attempts").select("id")
      .eq("test_id", test_id).eq("clerk_user_id", user.id).eq("status", "in_progress").single();
    if (existing) return NextResponse.json({ attempt_id: existing.id });

    const { data, error } = await db.from("attempts")
      .insert({ test_id, clerk_user_id: user.id, answers: {}, status: "in_progress" })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ attempt_id: data.id });
  }

  if (action === "save") {
    const { error } = await db.from("attempts").update({ answers: answers ?? {} })
      .eq("id", attempt_id).eq("clerk_user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "submit") {
    const { data: attempt } = await db.from("attempts").select("test_id")
      .eq("id", attempt_id).eq("clerk_user_id", user.id).single();
    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });

    const { data: questions } = await db.from("questions").select("*").eq("test_id", attempt.test_id);
    const result = calculateScore(questions as Question[], answers ?? {});

    const { data, error } = await db.from("attempts").update({
      answers: answers ?? {}, status: "submitted",
      submitted_at: new Date().toISOString(), time_taken_secs,
      score: result.score, max_score: result.maxScore,
      correct_count: result.correct, incorrect_count: result.incorrect,
      unattempted_count: result.unattempted, percentage: result.percentage,
      subject_scores: result.subjectScores,
    }).eq("id", attempt_id).eq("clerk_user_id", user.id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const testId = req.nextUrl.searchParams.get("test_id");
  const db = createServiceClient();
  const query = db.from("attempts").select("*").eq("clerk_user_id", user.id)
    .order("started_at", { ascending: false });
  if (testId) query.eq("test_id", testId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
