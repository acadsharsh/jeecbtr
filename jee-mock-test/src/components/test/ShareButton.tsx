"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Share2, Check } from "lucide-react";

interface Props {
  slug: string;
  isPublic: boolean;
}

export function ShareButton({ slug, isPublic }: Props) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!isPublic) {
      toast.error("Make the test public first to share it.");
      return;
    }
    const url = `${window.location.origin}/tests/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <button onClick={handleShare} className="btn-neo-outline text-sm">
      {copied ? <Check size={15} className="text-emerald-500" /> : <Share2 size={15} />}
      {copied ? "Copied!" : "Share Link"}
    </button>
  );
}
