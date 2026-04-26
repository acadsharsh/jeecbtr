export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-50 bg-grid-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <a href="/" className="font-display text-3xl font-black text-ink-900">
            JEE<span className="text-amber-500">Forge</span>
          </a>
        </div>
        {children}
      </div>
    </div>
  );
}
