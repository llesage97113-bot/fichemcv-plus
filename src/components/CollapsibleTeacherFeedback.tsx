"use client";

import { useId, useState } from "react";
import TeacherSectionFeedbackEditor from "@/components/TeacherSectionFeedbackEditor";

type CollapsibleTeacherFeedbackProps = {
  sectionId: string;
  initialFeedback?: string | null;
  readOnly?: boolean;
};

export default function CollapsibleTeacherFeedback({
  sectionId,
  initialFeedback = null,
  readOnly = false,
}: CollapsibleTeacherFeedbackProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasSavedFeedback, setHasSavedFeedback] = useState(
    (initialFeedback ?? "").trim().length > 0
  );
  const contentId = useId();

  return (
    <div className="border-t border-slate-800 bg-slate-950/30 px-4 py-3 sm:px-5">
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={() => setIsExpanded((expanded) => !expanded)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-200 transition hover:bg-red-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
      >
        <span>
          Remarque professeur
          {hasSavedFeedback && (
            <span className="font-medium text-red-300"> • renseignée</span>
          )}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className={`h-5 w-5 shrink-0 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        >
          <path
            d="m5 7.5 5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div id={contentId} hidden={!isExpanded} className="px-3 pb-2 pt-3">
        <TeacherSectionFeedbackEditor
          sectionId={sectionId}
          initialFeedback={initialFeedback}
          readOnly={readOnly}
          embedded
          onFeedbackSaved={(feedback) =>
            setHasSavedFeedback(feedback.trim().length > 0)
          }
        />
      </div>
    </div>
  );
}
