import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { BookOpen, Upload, Timer, BarChart3, Share2, Zap } from "lucide-react";

export default async function HomePage() {
  const user = await getUser();
  if (user) redirect("/dashboard");

  const features = [
    { icon: Upload, title: "PDF → Prompt → Questions", desc: "Upload any textbook PDF. We extract the text and generate a ready-to-paste AI prompt. Get questions JSON back and import instantly." },
    { icon: BookOpen, title: "In-browser PDF Viewer", desc: "View your PDF, drag to crop diagrams, and attach them directly to questions with our built-in PDF.js viewer." },
    { icon: Timer, title: "Timed Mock Tests", desc: "JEE-accurate timer, question palette, mark-for-review — the real exam experience in your browser." },
    { icon: BarChart3, title: "Score Analytics", desc: "Per-subject breakdowns, accuracy rates, time analysis. Understand exactly where you stand." },
    { icon: Share2, title: "Share Tests", desc: "Make any test public with a slug-based URL. Share with friends or your entire coaching batch." },
    { icon: Zap, title: "Full CRUD", desc: "Create, edit, duplicate and delete tests. Manage your entire question bank from one dashboard." },
  ];

  return (
    <div className="min-h-screen bg-ink-50 bg-grid-ink">
      <nav className="border-b-2 border-ink-900 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-display text-2xl font-bold text-ink-900 tracking-tight">
            JEE<span className="text-amber-500">Forge</span>
          </span>
          <div className="flex items-center gap-3">
            <Link href="/auth/sign-in" className="btn-neo-outline text-sm">Sign In</Link>
            <Link href="/auth/sign-up" className="btn-neo-amber text-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div className="stagger-children">
          <div className="badge text-amber-600 border-amber-600 mb-6">Free & Open Source</div>
          <h1 className="font-display text-6xl md:text-8xl font-black text-ink-900 leading-none mb-6">
            Mock Tests,<br /><span className="text-amber-500">Forged</span> from<br />Your Notes.
          </h1>
          <p className="font-body text-lg text-ink-500 max-w-xl mb-10 leading-relaxed">
            Upload any PDF → get an AI prompt → paste JSON → instant JEE mock test.
            Built for serious aspirants who want more practice, not more excuses.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth/sign-up" className="btn-neo-amber px-6 py-3 text-base">Start Forging →</Link>
            <Link href="/auth/sign-in" className="btn-neo-outline px-6 py-3 text-base">Sign In</Link>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-3 gap-0 border-2 border-ink-900 bg-white">
          {[
            { val: "3-step", label: "PDF to Test" },
            { val: "JEE-accurate", label: "Marking scheme" },
            { val: "Instant", label: "Score analytics" },
          ].map((s, i) => (
            <div key={i} className={`px-8 py-6 ${i < 2 ? "border-r-2 border-ink-900" : ""}`}>
              <div className="font-display text-3xl font-bold text-ink-900">{s.val}</div>
              <div className="font-body text-sm text-ink-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="section-label mb-8">What you get</div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0 border-2 border-ink-900">
          {features.map((f, i) => {
            const Icon = f.icon;
            const col = i % 3;
            const row = Math.floor(i / 3);
            const isLastInRow = col === 2 || i === features.length - 1;
            const isLastRow = row === Math.floor((features.length - 1) / 3);
            return (
              <div key={i} className={`p-8 bg-white hover:bg-amber-50 transition-colors duration-200 ${!isLastInRow ? "border-r-2 border-ink-900" : ""} ${!isLastRow ? "border-b-2 border-ink-900" : ""}`}>
                <div className="w-10 h-10 border-2 border-ink-900 flex items-center justify-center mb-4 bg-amber-50">
                  <Icon size={18} className="text-ink-900" />
                </div>
                <h3 className="font-display text-lg font-bold text-ink-900 mb-2">{f.title}</h3>
                <p className="font-body text-sm text-ink-500 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-t-2 border-ink-900 bg-ink-900 py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="font-display text-5xl font-black text-ink-50 mb-4">Ready to start?</h2>
          <p className="font-body text-ink-300 mb-8 text-lg">No credit card. No subscriptions. Just better mock tests.</p>
          <Link href="/auth/sign-up" className="btn-neo-amber px-8 py-3 text-base inline-flex">
            Create Your First Test →
          </Link>
        </div>
      </section>
    </div>
  );
}
