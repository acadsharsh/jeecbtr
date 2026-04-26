import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createServiceClient } from "@/lib/supabase";
import { generateSlug } from "@/lib/utils";
import type { CreateTestPayload } from "@/types";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();
  const { data, error } = await db.from("tests").select("*, questions(count)")
    .eq("clerk_user_id", user.id).order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body: CreateTestPayload = await req.json();
    const { questions, ...testData } = body;
    if (!testData.title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (!questions?.length) return NextResponse.json({ error: "At least one question is required" }, { status: 400 });

    const db = createServiceClient();
    const slug = generateSlug(testData.title);
    const totalMarks = questions.reduce((s, q) => s + q.marks_correct, 0);

    const { data: test, error: testErr } = await db.from("tests")
      .insert({ ...testData, clerk_user_id: user.id, slug, total_marks: totalMarks })
      .select().single();
    if (testErr) throw new Error(testErr.message);

    const questionRows = questions.map((q, i) => ({
      test_id: test.id,
      question_number: q.question_number ?? i + 1,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options ?? null,
      correct_answer: q.correct_answer,
      explanation: q.explanation ?? null,
      marks_correct: q.marks_correct,
      marks_incorrect: q.marks_incorrect,
      topic: q.topic ?? null,
      subtopic: q.subtopic ?? null,
      diagram_url: null,
    }));
    const { error: qErr } = await db.from("questions").insert(questionRows);
    if (qErr) throw new Error(qErr.message);

    return NextResponse.json({ test }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
