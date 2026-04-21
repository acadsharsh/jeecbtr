# JEEForge — Mock Test Generator

A production-ready Next.js 14 application for generating, taking, and analysing JEE-style mock tests from PDF study materials.

---

## ✨ Features

| Feature | Details |
|---|---|
| **PDF → Prompt** | Upload any PDF; server extracts text with `pdf-parse`; generates a copy-paste prompt for any AI |
| **JSON Import** | Paste AI-generated JSON to instantly create a full test |
| **In-browser PDF Viewer** | PDF.js viewer with drag-to-crop diagram extraction |
| **Supabase Storage** | Cropped diagrams stored in Supabase Storage, linked to questions |
| **Full Test CRUD** | Create, view, toggle public/private, delete tests |
| **Slug URLs** | Public tests accessible at `/tests/<slug>` — shareable with anyone |
| **Timed Interface** | JEE-accurate timer, question palette (answered / flagged / skipped), autosave every 30 s |
| **Score Analytics** | Per-question review, topic-wise breakdown, % score, correct/wrong/skipped stats |
| **Clerk Auth** | Sign-in / sign-up with Clerk; all routes protected except public test view |
| **RLS** | Supabase Row Level Security — users only access their own data |

---

## 🗂 Project Structure

```
jee-mock-test/
├── src/
│   ├── app/
│   │   ├── page.tsx                        # Landing page
│   │   ├── layout.tsx                      # Root layout (Clerk + fonts)
│   │   ├── globals.css
│   │   ├── auth/
│   │   │   ├── sign-in/page.tsx
│   │   │   └── sign-up/page.tsx
│   │   ├── dashboard/
│   │   │   ├── layout.tsx                  # Sidebar layout
│   │   │   ├── page.tsx                    # Dashboard home
│   │   │   └── tests/page.tsx              # My Tests listing
│   │   ├── upload/
│   │   │   └── page.tsx                    # PDF upload → prompt → JSON import
│   │   ├── tests/
│   │   │   ├── layout.tsx
│   │   │   ├── new/page.tsx                # Create test
│   │   │   └── [slug]/
│   │   │       ├── page.tsx                # Test detail / preview
│   │   │       ├── attempt/page.tsx        # Timed test-taking interface
│   │   │       └── results/page.tsx        # Score + analytics
│   │   └── api/
│   │       ├── extract-pdf/route.ts        # PDF text extraction
│   │       ├── tests/
│   │       │   ├── route.ts                # GET (list) / POST (create)
│   │       │   ├── [id]/route.ts           # GET / PATCH / DELETE by ID
│   │       │   └── by-slug/[slug]/route.ts # GET by slug (for attempt page)
│   │       ├── attempts/route.ts           # Start / autosave / submit
│   │       └── upload-diagram/route.ts     # Supabase Storage upload
│   ├── components/
│   │   ├── layout/
│   │   │   └── Sidebar.tsx
│   │   ├── test/
│   │   │   ├── DeleteTestButton.tsx
│   │   │   ├── ShareButton.tsx
│   │   │   └── TogglePublicButton.tsx
│   │   └── pdf/
│   │       └── PDFViewer.tsx               # PDF.js viewer + drag-crop
│   ├── hooks/
│   │   ├── useTimer.ts
│   │   └── useAutosave.ts
│   ├── lib/
│   │   ├── supabase.ts                     # Browser + service role clients
│   │   └── utils.ts                        # cn, slugify, score calc, prompt builder
│   └── types/
│       └── index.ts
├── supabase/
│   └── migrations/
│       └── 001_initial.sql                 # Full DB schema + RLS + Storage policies
├── .env.local.example
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier is fine)
- A [Clerk](https://clerk.com) application (free tier is fine)

---

### 1 — Clone & Install

```bash
git clone <your-repo-url>
cd jee-mock-test
npm install
```

---

### 2 — Environment Variables

Copy the example file and fill in your keys:

```bash
cp .env.local.example .env.local
```

Open `.env.local` and set:

```env
# ─── Clerk ───────────────────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# ─── Supabase ────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ─── App ─────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Getting your Clerk keys
1. Go to [clerk.com](https://clerk.com) → create an app
2. Dashboard → **API Keys** → copy publishable key + secret key

#### Getting your Supabase keys
1. Go to [supabase.com](https://supabase.com) → create a project
2. **Settings → API** → copy Project URL, `anon` key, and `service_role` key

---

### 3 — Run the Database Migration

1. Open your Supabase project
2. Go to **SQL Editor**
3. Paste the entire contents of `supabase/migrations/001_initial.sql`
4. Click **Run**

This creates:
- `tests` table
- `questions` table  
- `attempts` table
- All indexes
- Row Level Security policies
- `diagrams` Storage bucket + policies

---

### 4 — Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📖 How to Use

### Creating a Test from a PDF

1. **Upload PDF** → Navigate to "Upload PDF" in the sidebar
2. Choose your PDF file, set subject/difficulty/question count
3. Click **Extract & Generate Prompt** — the app extracts text server-side
4. **Copy the prompt** and paste it into any AI (ChatGPT, Claude, Gemini, etc.)
5. The AI returns a JSON block — copy it
6. Click **"I have the JSON → Next"**, paste the JSON
7. Click **Import & Create Test** — you're redirected to the test creator
8. Fill in the title, subject, duration → **Create Test**

### Using the PDF Viewer with Diagram Crop

1. Go to the Upload page or any page that embeds the `PDFViewer` component
2. Click **Open PDF** to load a PDF
3. Click **Crop Diagram** to enter crop mode
4. **Drag** over any diagram or figure on the PDF
5. Click **Upload Crop** — the image is saved to Supabase Storage and linked to a question

### Taking a Test

1. Open any test → click **Start Test**
2. The timer starts automatically
3. Answer questions using the option buttons (MCQ) or number input (numerical)
4. Use the **question palette** (right sidebar) to jump between questions
5. **Flag** any question to revisit
6. Answers autosave every 30 seconds
7. Click **Submit** (or let the timer expire) → view your results

### Sharing a Test

1. Open your test → click **Make Public**
2. Click **Share Link** → URL is copied to clipboard
3. Anyone with the URL can view and attempt the test (no login required to view)

---

## 🗄 Database Schema

### `tests`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `clerk_user_id` | TEXT | Clerk user ID |
| `title` | TEXT | |
| `slug` | TEXT | Unique, URL-friendly |
| `subject` | TEXT | physics / chemistry / mathematics / mixed |
| `difficulty` | TEXT | easy / medium / hard |
| `duration_mins` | INT | Default 180 |
| `is_public` | BOOL | Default false |
| `total_marks` | INT | Computed on insert |

### `questions`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `test_id` | UUID | FK → tests |
| `question_type` | TEXT | mcq / numerical / multi_correct |
| `options` | JSONB | `[{label, text}]` — null for numerical |
| `correct_answer` | TEXT | "A", "B,D", or numeric string |
| `marks_correct` | INT | Default 4 |
| `marks_incorrect` | NUMERIC | Default −1 |
| `diagram_url` | TEXT | Supabase Storage public URL |

### `attempts`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | |
| `test_id` | UUID | FK → tests |
| `clerk_user_id` | TEXT | |
| `answers` | JSONB | `{question_id: answer}` |
| `status` | TEXT | in_progress / submitted / abandoned |
| `score` | NUMERIC | Calculated on submit |
| `subject_scores` | JSONB | Per-topic breakdown |

---

## 🎨 Design System

The app uses a **neobrutalist** design language:

- **Font**: Playfair Display (headings) + DM Sans (body) + JetBrains Mono (code/labels)
- **Colors**: Deep ink (`#0F0E0D`) as primary, amber (`#F59E0B`) as accent
- **Cards**: Hard drop shadows (`4px 4px 0 #0F0E0D`), 2px solid borders
- **Buttons**: Shift on click (shadow removal), shift on hover (shadow increase)
- **CSS classes**: `card-neo`, `btn-neo`, `btn-neo-amber`, `btn-neo-outline`, `badge`, `input-neo`, `section-label`

---

## 🔒 Security

- All API routes check Clerk auth via `auth()` from `@clerk/nextjs/server`
- Supabase service role key is **server-only** (never exposed to client)
- Row Level Security ensures users can only read/write their own data
- Public tests are readable by anyone; private tests are hidden
- PDF extraction runs server-side in a Node.js route handler

---

## 🚢 Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard or via CLI:
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
vercel env add CLERK_SECRET_KEY
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_APP_URL
```

Set `NEXT_PUBLIC_APP_URL` to your production URL (e.g. `https://jeeforge.vercel.app`).

---

## 🧩 JSON Question Format

When you paste the AI prompt and get a response, it should match this schema:

```json
{
  "questions": [
    {
      "question_number": 1,
      "question_text": "A block of mass 2 kg is placed on a frictionless surface...",
      "question_type": "mcq",
      "options": [
        { "label": "A", "text": "5 m/s²" },
        { "label": "B", "text": "10 m/s²" },
        { "label": "C", "text": "2.5 m/s²" },
        { "label": "D", "text": "20 m/s²" }
      ],
      "correct_answer": "A",
      "explanation": "By Newton's second law, F = ma → a = F/m = 10/2 = 5 m/s²",
      "marks_correct": 4,
      "marks_incorrect": -1,
      "topic": "physics",
      "subtopic": "Newton's Laws of Motion"
    },
    {
      "question_number": 2,
      "question_text": "The value of ∫₀¹ x² dx is",
      "question_type": "numerical",
      "correct_answer": "0.333",
      "explanation": "∫₀¹ x² dx = [x³/3]₀¹ = 1/3 ≈ 0.333",
      "marks_correct": 4,
      "marks_incorrect": 0,
      "topic": "mathematics",
      "subtopic": "Integration"
    }
  ]
}
```

### Supported `question_type` values:
- `mcq` — Single correct, options A–D, marking: +4/−1
- `numerical` — Enter a number, marking: +4/0  
- `multi_correct` — One or more correct options (answer like `"A,C"`), marking: +4/0

---

## 📦 Key Dependencies

| Package | Purpose |
|---|---|
| `@clerk/nextjs` | Authentication |
| `@supabase/supabase-js` | Database + Storage client |
| `pdf-parse` | Server-side PDF text extraction |
| `pdfjs-dist` | In-browser PDF rendering (loaded from CDN) |
| `slugify` | URL slug generation |
| `uuid` | Unique IDs |
| `tailwindcss` | Styling |
| `react-hot-toast` | Toast notifications |

---

## 🛠 Common Issues

**PDF extraction returns no text**  
→ Your PDF is likely a scanned image (not text-based). Use a text-based PDF, or run OCR first.

**PDF viewer doesn't load**  
→ PDF.js is loaded from cdnjs CDN. Check your network connection and browser console.

**Clerk redirect loops**  
→ Ensure `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `SIGN_UP_URL`, and `AFTER_SIGN_IN_URL` match your actual routes.

**Supabase RLS blocking reads**  
→ The service role key bypasses RLS for server routes. Make sure `SUPABASE_SERVICE_ROLE_KEY` is set and is the correct key (not the anon key).

**Storage bucket doesn't exist**  
→ The migration SQL creates the bucket if it doesn't exist. Re-run the SQL or create the `diagrams` bucket manually in Supabase Dashboard → Storage.

---

## 📄 License

MIT — use freely, build on top of it, help more JEE aspirants.

---

## 🌐 Deploying to Netlify

### Prerequisites
- A [Netlify](https://netlify.com) account (free tier works)
- Your repo pushed to GitHub / GitLab / Bitbucket

---

### Option A — One-click via Netlify UI (recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/jee-mock-test.git
   git push -u origin main
   ```

2. **Import on Netlify**
   - Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
   - Connect GitHub → select your repo

3. **Build settings** (auto-detected from `netlify.toml`):
   | Field | Value |
   |---|---|
   | Build command | `npm run build` |
   | Publish directory | `.next` |
   | Node version | `20` |

4. **Add environment variables**
   - Netlify Dashboard → **Site Configuration → Environment Variables**
   - Add every variable from `.env.netlify.example`
   - Mark `SUPABASE_SERVICE_ROLE_KEY` and `CLERK_SECRET_KEY` as **Secret**

5. **Deploy** — Netlify will build and give you a URL like `https://jee-forge.netlify.app`

6. **Update `NEXT_PUBLIC_APP_URL`** to match your Netlify URL, then redeploy.

---

### Option B — Netlify CLI

```bash
# Install CLI
npm install -g netlify-cli

# Login
netlify login

# Link to existing site or create new
netlify init

# Set env vars from your .env.local
netlify env:import .env.local

# Deploy preview
netlify deploy

# Deploy to production
netlify deploy --prod
```

---

### Clerk: Add your Netlify URL as allowed origin

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → your app
2. **Configure → Domains** → Add your Netlify domain
   ```
   https://jee-forge.netlify.app
   ```
3. Also update Clerk's **Redirect URLs** if you customised them.

---

### Supabase: Verify allowed origins (optional but recommended)

1. Supabase Dashboard → **Authentication → URL Configuration**
2. Add your Netlify URL to **Redirect URLs**:
   ```
   https://jee-forge.netlify.app/**
   ```

---

### How Netlify runs Next.js 14

`@netlify/plugin-nextjs` (declared in `netlify.toml`) automatically:
- Converts **API routes** → Netlify Functions (serverless, up to 60s timeout)
- Converts **Server Components** → On-demand rendering
- Handles **ISR / streaming** correctly
- Serves **static assets** from the Netlify CDN

No extra configuration needed beyond the `netlify.toml` already in the project.

---

### Netlify Function limits (free tier)

| Limit | Free tier |
|---|---|
| Invocations / month | 125,000 |
| Execution time | 10s (background: 15 min) |
| Payload size | 6 MB |

> **Note:** The PDF extraction route has a 60s timeout set in `netlify.toml`. Large PDFs (>10 MB) may hit the 6 MB payload limit on the free tier. Consider upgrading to Netlify Pro or splitting large PDFs before upload.

