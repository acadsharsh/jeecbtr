import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createServiceClient } from "@/lib/supabase";
import { generateSlug } from "@/lib/utils";
import type { CreateTestPayload, QuestionType } from "@/types";

// ─── Normalize question_type to the 3 values the DB allows ───────────
// AI-generated JSON often uses variants like "multiple_correct", "integer",
// "msq", "single_correct" etc. This maps them to the valid DB values.
function normalizeQuestionType(raw: string | undefined): QuestionType {
  const t = (raw ?? "mcq").toLowerCase().trim();

  if (
    t === "multi_correct" ||
    t === "multiple_correct" ||
    t === "msq" ||
    t === "multiple" ||
    t === "multi-correct" ||
    t === "multiple correct"
  ) return "multi_correct";

  if (
    t === "numerical" ||
    t === "integer" ||
    t === "integer_type" ||
    t === "numeric" ||
    t === "fill_in_the_blank"
  ) return "numerical";

  // default → mcq  (covers "mcq", "single_correct", "single", unknown values)
  return "mcq";
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createServiceClient();
  const { data, error } = await db
    .from("tests")
    .select("*, questions(count)")
    .eq("clerk_user_id", user.id)
    .order("created_at", { ascending: false });

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
    if (!testData.title?.trim())
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (!questions?.length)
      return NextResponse.json({ error: "At least one question is required" }, { status: 400 });

    const db = createServiceClient();
    const slug = generateSlug(testData.title);
    const totalMarks = questions.reduce((s, q) => s + q.marks_correct, 0);

    const { data: test, error: testErr } = await db
      .from("tests")
      .insert({ ...testData, clerk_user_id: user.id, slug, total_marks: totalMarks })
      .select()
      .single();
    if (testErr) throw new Error(testErr.message);

    const questionRows = questions.map((q, i) => ({
      test_id: test.id,
      question_number: q.question_number ?? i + 1,
      question_text: q.question_text,
      question_type: normalizeQuestionType(q.question_type), // ← fixed
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
