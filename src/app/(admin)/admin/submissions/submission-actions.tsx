"use client";

import { useState } from "react";
import { Check, X, RotateCcw } from "lucide-react";
import {
  approveSubmission,
  rejectSubmission,
  reprocessSubmission,
} from "@/lib/actions/admin";

export function SubmissionActions({
  submissionId,
  status,
}: {
  submissionId: string;
  status: string;
}) {
  const [loading, setLoading] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [reason, setReason] = useState("");

  async function handleApprove() {
    setLoading(true);
    try {
      await approveSubmission(submissionId);
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await rejectSubmission(submissionId, reason.trim());
      setShowRejectInput(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleReprocess() {
    setLoading(true);
    try {
      await reprocessSubmission(submissionId);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <span className="text-xs text-text-tertiary">Processing…</span>
    );
  }

  if (status === "pending") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            className="flex items-center gap-1 rounded bg-accent-positive/15 px-2 py-1 text-xs font-medium text-accent-positive transition-colors hover:bg-accent-positive/25"
          >
            <Check className="h-3 w-3" />
            Approve
          </button>
          <button
            onClick={() => setShowRejectInput(!showRejectInput)}
            className="flex items-center gap-1 rounded bg-accent-negative/15 px-2 py-1 text-xs font-medium text-accent-negative transition-colors hover:bg-accent-negative/25"
          >
            <X className="h-3 w-3" />
            Reject
          </button>
        </div>
        {showRejectInput && (
          <div className="flex gap-2">
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Rejection reason"
              className="flex-1 rounded border border-border-subtle bg-bg-primary px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleReject();
              }}
            />
            <button
              onClick={handleReject}
              disabled={!reason.trim()}
              className="rounded bg-accent-negative/15 px-2 py-1 text-xs font-medium text-accent-negative transition-colors hover:bg-accent-negative/25 disabled:opacity-50"
            >
              Confirm
            </button>
          </div>
        )}
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <button
        onClick={handleReprocess}
        className="flex items-center gap-1 rounded bg-accent-primary/15 px-2 py-1 text-xs font-medium text-accent-primary transition-colors hover:bg-accent-primary/25"
      >
        <RotateCcw className="h-3 w-3" />
        Reprocess
      </button>
    );
  }

  return null;
}
