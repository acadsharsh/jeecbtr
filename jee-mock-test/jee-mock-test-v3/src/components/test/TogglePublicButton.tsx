"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Globe, Lock, Loader2 } from "lucide-react";

interface Props {
  testId: string;
  isPublic: boolean;
}

export function TogglePublicButton({ testId, isPublic }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentPublic, setCurrentPublic] = useState(isPublic);

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tests/${testId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: !currentPublic }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      const next = !currentPublic;
      setCurrentPublic(next);
      toast.success(next ? "Test is now public" : "Test is now private");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update visibility");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={toggle} disabled={loading} className="btn-neo-outline text-sm disabled:opacity-50">
      {loading ? (
        <Loader2 size={15} className="animate-spin" />
      ) : currentPublic ? (
        <Globe size={15} className="text-emerald-500" />
      ) : (
        <Lock size={15} />
      )}
      {currentPublic ? "Make Private" : "Make Public"}
    </button>
  );
}
