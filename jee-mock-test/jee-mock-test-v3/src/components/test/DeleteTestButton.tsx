"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Trash2, Loader2 } from "lucide-react";

interface Props {
  testId: string;
  testTitle: string;
}

export function DeleteTestButton({ testId, testTitle }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/tests/${testId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      toast.success("Test deleted");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-2 py-1 text-xs font-mono bg-crimson-500 text-white border-2 border-crimson-500 hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {deleting ? <Loader2 size={11} className="animate-spin" /> : "Yes"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-2 py-1 text-xs font-mono border border-ink-300 text-ink-500 hover:border-ink-900 transition-colors"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title={`Delete "${testTitle}"`}
      className="p-1.5 border border-ink-200 text-ink-400 hover:border-crimson-500 hover:text-crimson-500 transition-all"
    >
      <Trash2 size={13} />
    </button>
  );
}
