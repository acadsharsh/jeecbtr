// ─── Database Types ───────────────────────────────────────────────────

export type Subject = "physics" | "chemistry" | "mathematics" | "mixed";
export type Difficulty = "easy" | "medium" | "hard";
export type QuestionType = "mcq" | "numerical" | "multi_correct";
export type AttemptStatus = "in_progress" | "submitted" | "abandoned";

export interface Test {
  id: string;
  clerk_user_id: string;
  title: string;
  description: string | null;
  slug: string;
  subject: Subject;
  difficulty: Difficulty;
  duration_mins: number;
  is_public: boolean;
  source_pdf_name: string | null;
  total_marks: number;
  created_at: string;
  updated_at: string;
  questions?: Question[];
}

export interface Option {
  label: "A" | "B" | "C" | "D";
  text: string;
}

export interface Question {
  id: string;
  test_id: string;
  question_number: number;
  question_text: string;
  question_type: QuestionType;
  options: Option[] | null;
  correct_answer: string;
  explanation: string | null;
  marks_correct: number;
  marks_incorrect: number;
  diagram_url: string | null;
  topic: string | null;
  subtopic: string | null;
  created_at: string;
}

export interface SubjectScore {
  score: number;
  max: number;
  correct: number;
  incorrect: number;
}

export interface Attempt {
  id: string;
  test_id: string;
  clerk_user_id: string;
  started_at: string;
  submitted_at: string | null;
  time_taken_secs: number | null;
  answers: Record<string, string>;
  score: number | null;
  max_score: number | null;
  correct_count: number | null;
  incorrect_count: number | null;
  unattempted_count: number | null;
  percentage: number | null;
  subject_scores: Record<string, SubjectScore> | null;
  status: AttemptStatus;
}

// ─── API / Generation Types ───────────────────────────────────────────

export interface GeneratedQuestion {
  question_number: number;
  question_text: string;
  question_type: QuestionType;
  options?: Option[];
  correct_answer: string;
  explanation?: string;
  marks_correct: number;
  marks_incorrect: number;
  topic?: string;
  subtopic?: string;
}

export interface GeneratedQuestionsJSON {
  questions: GeneratedQuestion[];
}

export interface CreateTestPayload {
  title: string;
  description?: string;
  subject: Subject;
  difficulty: Difficulty;
  duration_mins: number;
  is_public: boolean;
  source_pdf_name?: string;
  questions: GeneratedQuestion[];
}

// ─── UI State Types ───────────────────────────────────────────────────

export interface TestFilters {
  subject?: Subject;
  difficulty?: Difficulty;
  search?: string;
}

export interface AnalyticsData {
  totalTests: number;
  totalAttempts: number;
  avgScore: number;
  bestScore: number;
  subjectBreakdown: Record<string, { attempts: number; avgScore: number }>;
  recentAttempts: (Attempt & { test: Test })[];
}

export interface TimerState {
  remainingSecs: number;
  isRunning: boolean;
  isExpired: boolean;
}

export type AnswerMap = Record<string, string>;

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
