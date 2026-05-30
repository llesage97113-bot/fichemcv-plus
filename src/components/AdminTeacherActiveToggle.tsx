"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AdminTeacherActiveToggleProps = {
  teacherId: string;
  teacherEmail: string;
  isActive: boolean;
};

export default function AdminTeacherActiveToggle({
  teacherId,
  teacherEmail,
  isActive,
}: AdminTeacherActiveToggleProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextState = !isActive;

  async function handleToggle() {
    const confirmed = window.confirm(
      `${nextState ? "Réactiver" : "Désactiver"} le compte professeur ${teacherEmail} ?`
    );

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/teachers/toggle-active", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teacherId,
          isActive: nextState,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Modification impossible.");
      }

      router.refresh();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Erreur inconnue pendant la modification du compte professeur."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isSubmitting}
      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
        isActive
          ? "border-red-500/40 text-red-200 hover:bg-red-950/30"
          : "border-emerald-500/40 text-emerald-200 hover:bg-emerald-950/30"
      }`}
    >
      {isSubmitting
        ? "Modification..."
        : isActive
          ? "Désactiver"
          : "Réactiver"}
    </button>
  );
}
