import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import slugify from "slugify";
import { v4 as uuidv4 } from "uuid";
import type { Question, AnswerMap, Attempt } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSlug(title: string): string {
  const base = slugify(title, { lower: true, strict: true, trim: true });
  const short = uuidv4().split("-")[0];
  return `${base}-${short}`;
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function calculateScore(
  questions: Question[],
  answers: AnswerMap
): {
  score: number;
  maxScore: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  percentage: number;
  subjectScores: Record<string, { score: number; max: number; correct: number; incorrect: number }>;
} {
  let score = 0;
  let correct = 0;
  let incorrect = 0;
  let unattempted = 0;
  let maxScore = 0;
  const subjectScores: Record<string, { score: number; max: number; correct: number; incorrect: number }> = {};

  for (const q of questions) {
    const topic = q.topic || "general";
    if (!subjectScores[topic]) subjectScores[topic] = { score: 0, max: 0, correct: 0, incorrect: 0 };

    maxScore += q.marks_correct;
    subjectScores[topic].max += q.marks_correct;

    const userAnswer = answers[q.id];
    if (!userAnswer) {
      unattempted++;
    } else if (userAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()) {
      score += q.marks_correct;
      subjectScores[topic].score += q.marks_correct;
      correct++;
      subjectScores[topic].correct++;
    } else {
      score += Number(q.marks_incorrect);
      subjectScores[topic].score += Number(q.marks_incorrect);
      incorrect++;
      subjectScores[topic].incorrect++;
    }
  }

  return {
    score: Math.round(score * 100) / 100,
    maxScore,
    correct,
    incorrect,
    unattempted,
    percentage: maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0,
    subjectScores,
  };
}

export function getScoreColor(percentage: number): string {
  if (percentage >= 75) return "text-emerald-500";
  if (percentage >= 50) return "text-amber-500";
  return "text-crimson-500";
}

export function getScoreBadge(percentage: number): string {
  if (percentage >= 90) return "Excellent";
  if (percentage >= 75) return "Good";
  if (percentage >= 50) return "Average";
  if (percentage >= 35) return "Below Average";
  return "Poor";
}

// Build the prompt that users will paste into any AI to get questions JSON
export function buildExtractionPrompt(pdfText: string, options: {
  subject: string;
  difficulty: string;
  questionCount: number;
}): string {
  return `You are an expert JEE (Joint Entrance Examination) question paper creator.

Analyze the following text extracted from a study material/textbook and generate ${options.questionCount} high-quality JEE-style questions.

SUBJECT: ${options.subject}
DIFFICULTY: ${options.difficulty}

INSTRUCTIONS:
- Generate a mix of MCQ (single correct), multi_correct (multiple correct), and numerical questions
- For MCQ: provide 4 options (A, B, C, D) and one correct answer
- For multi_correct: provide 4 options, correct_answer as comma-separated like "A,C"
- For numerical: no options needed, correct_answer is the numeric value as string
- marks_correct: 4 for MCQ/multi_correct, 4 for numerical
- marks_incorrect: -1 for MCQ, 0 for multi_correct, 0 for numerical
- Include clear explanations
- Add topic and subtopic tags

OUTPUT FORMAT — respond ONLY with valid JSON, no markdown, no extra text:
{
  "questions": [
    {
      "question_number": 1,
      "question_text": "Question text here",
      "question_type": "mcq",
      "options": [
        {"label": "A", "text": "Option A"},
        {"label": "B", "text": "Option B"},
        {"label": "C", "text": "Option C"},
        {"label": "D", "text": "Option D"}
      ],
      "correct_answer": "B",
      "explanation": "Detailed explanation",
      "marks_correct": 4,
      "marks_incorrect": -1,
      "topic": "${options.subject}",
      "subtopic": "Specific subtopic"
    }
  ]
}

TEXT TO ANALYZE:
---
${pdfText.slice(0, 12000)}
---

Generate the JSON now:`;
}
