import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireTeacher() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || user.app_metadata?.role !== "professeur") {
    return null;
  }

  return user;
}

const E31_SECTIONS = [
  {
    section_key: "contexte",
    section_title: "Contexte de la situation de vente",
    linked_competencies: ["contexte", "communication_professionnelle"],
    sort_order: 1,
  },
  {
    section_key: "besoin_client",
    section_title: "Découverte du besoin client",
    linked_competencies: ["questionnement", "besoin_client"],
    sort_order: 2,
  },
  {
    section_key: "offre_proposee",
    section_title: "Offre proposée",
    linked_competencies: ["offre_adaptee"],
    sort_order: 3,
  },
  {
    section_key: "argumentation",
    section_title: "Argumentation utilisée",
    linked_competencies: ["argumentation_commerciale"],
    sort_order: 4,
  },
  {
    section_key: "communication_professionnelle",
    section_title: "Communication professionnelle",
    linked_competencies: ["communication_professionnelle"],
    sort_order: 5,
  },
  {
    section_key: "bilan",
    section_title: "Bilan de la situation",
    linked_competencies: ["analyse_reflexive"],
    sort_order: 6,
  },
];

const E32_SECTIONS = [
  {
    section_key: "contexte_suivi",
    section_title: "Contexte de la situation de suivi",
    linked_competencies: ["contexte", "suivi_vente"],
    sort_order: 1,
  },
  {
    section_key: "suivi_commande",
    section_title: "Suivi de la commande",
    linked_competencies: ["suivi_commande"],
    sort_order: 2,
  },
  {
    section_key: "services_associes",
    section_title: "Services associés",
    linked_competencies: ["services_associes"],
    sort_order: 3,
  },
  {
    section_key: "retours_reclamations",
    section_title: "Retours ou réclamations",
    linked_competencies: ["reclamation", "demande_client"],
    sort_order: 4,
  },
  {
    section_key: "solution_client",
    section_title: "Solution proposée au client",
    linked_competencies: ["solution_client"],
    sort_order: 5,
  },
  {
    section_key: "satisfaction_client",
    section_title: "Satisfaction client",
    linked_competencies: ["satisfaction_client"],
    sort_order: 6,
  },
  {
    section_key: "amelioration_satisfaction",
    section_title: "Amélioration de la satisfaction",
    linked_competencies: ["amelioration_satisfaction"],
    sort_order: 7,
  },
  {
    section_key: "communication_professionnelle",
    section_title: "Communication professionnelle",
    linked_competencies: ["communication_professionnelle"],
    sort_order: 8,
  },
  {
    section_key: "bilan",
    section_title: "Bilan de la situation",
    linked_competencies: ["analyse_reflexive"],
    sort_order: 9,
  },
];

const FICHE_TEMPLATES = [
  {
    epreuve: "E31",
    numero_fiche: 1,
    title: "E31-1 — Préparer et présenter une situation de vente-conseil",
    item_key: "E31-1",
    item_label: "Préparer et présenter une situation de vente-conseil",
    item_description:
      "Présente le contexte professionnel, l’entreprise, le client, la situation commerciale et les conditions de l’entretien.",
    sections: E31_SECTIONS,
  },
  {
    epreuve: "E31",
    numero_fiche: 2,
    title: "E31-2 — Conduire l’entretien et proposer une offre adaptée",
    item_key: "E31-2",
    item_label: "Conduire l’entretien et proposer une offre adaptée",
    item_description:
      "Explique comment tu questionnes le client, identifies son besoin, proposes une offre adaptée et construis ton argumentation.",
    sections: E31_SECTIONS,
  },
  {
    epreuve: "E31",
    numero_fiche: 3,
    title: "E31-3 — Argumenter, finaliser et analyser la vente",
    item_key: "E31-3",
    item_label: "Argumenter, finaliser et analyser la vente",
    item_description:
      "Décris la finalisation de la vente, ta communication professionnelle, le résultat obtenu et ton bilan réflexif.",
    sections: E31_SECTIONS,
  },
  {
    epreuve: "E32",
    numero_fiche: 1,
    title: "E32-1 — Assurer le suivi d’une commande client",
    item_key: "E32-1",
    item_label: "Assurer le suivi d’une commande client",
    item_description:
      "Présente le suivi d’une commande, les outils utilisés, les étapes de contrôle et l’information transmise au client.",
    sections: E32_SECTIONS,
  },
  {
    epreuve: "E32",
    numero_fiche: 2,
    title: "E32-2 — Présenter les services associés à la vente",
    item_key: "E32-2",
    item_label: "Présenter les services associés à la vente",
    item_description:
      "Décris les services proposés autour de la vente : retrait, livraison, garantie, fidélisation, financement ou accompagnement.",
    sections: E32_SECTIONS,
  },
  {
    epreuve: "E32",
    numero_fiche: 3,
    title: "E32-3 — Traiter une demande, un retour ou une réclamation",
    item_key: "E32-3",
    item_label: "Traiter une demande, un retour ou une réclamation",
    item_description:
      "Explique la demande du client, le retour ou la réclamation rencontrée, puis la solution proposée et son suivi.",
    sections: E32_SECTIONS,
  },
  {
    epreuve: "E32",
    numero_fiche: 4,
    title: "E32-4 — Mesurer et améliorer la satisfaction client",
    item_key: "E32-4",
    item_label: "Mesurer et améliorer la satisfaction client",
    item_description:
      "Présente les indicateurs, retours clients ou outils utilisés pour mesurer la satisfaction et proposer des améliorations.",
    sections: E32_SECTIONS,
  },
];

async function createMissingFichesForStudent(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
  classId: string | null
) {
  if (!classId) {
    throw new Error("Impossible de générer les fiches : classe non renseignée.");
  }

  for (const template of FICHE_TEMPLATES) {
    const { data: existingFiche, error: existingFicheError } = await admin
      .from("fiches")
      .select("id")
      .eq("student_id", studentId)
      .eq("epreuve", template.epreuve)
      .eq("numero_fiche", template.numero_fiche)
      .maybeSingle();

    if (existingFicheError) {
      throw new Error(existingFicheError.message);
    }

    if (existingFiche) {
      continue;
    }

    const ficheId = crypto.randomUUID();

    const { error: ficheError } = await admin.from("fiches").insert({
      id: ficheId,
      student_id: studentId,
      class_id: classId,
      epreuve: template.epreuve,
      numero_fiche: template.numero_fiche,
      title: template.title,
      item_key: template.item_key,
      item_label: template.item_label,
      item_description: template.item_description,
      company_name: "",
      pfmp_period: "",
      situation_date: "",
      status: "brouillon",
      completion_score: 0,
      quality_status: "vide",
    });

    if (ficheError) {
      throw new Error(ficheError.message);
    }

    const sections = template.sections.map((section) => ({
      id: crypto.randomUUID(),
      fiche_id: ficheId,
      section_key: section.section_key,
      section_title: section.section_title,
      content: "",
      completion_status: "vide",
      character_count: 0,
      linked_competencies: section.linked_competencies,
      sort_order: section.sort_order,
    }));

    const { error: sectionsError } = await admin
      .from("fiche_sections")
      .insert(sections);

    if (sectionsError) {
      throw new Error(sectionsError.message);
    }
  }
}

export async function GET() {
  const teacher = await requireTeacher();

  if (!teacher) {
    return NextResponse.json(
      { error: "Accès réservé au professeur." },
      { status: 403 }
    );
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("students")
    .select(`
      id,
      first_name,
      last_name,
      student_code,
      registration_status,
      registration_submitted_at,
      created_at,
      classes (
        id,
        name,
        school_year,
        level
      ),
      app_users:user_id (
        id,
        email,
        role,
        is_active
      )
    `)
    .eq("registration_status", "pending")
    .order("registration_submitted_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ registrations: data ?? [] });
}

export async function POST(request: Request) {
  const teacher = await requireTeacher();

  if (!teacher) {
    return NextResponse.json(
      { error: "Accès réservé au professeur." },
      { status: 403 }
    );
  }

  const admin = createAdminClient();
  const body = await request.json().catch(() => null);

  const studentId = String(body?.studentId ?? "");
  const action = String(body?.action ?? "");

  if (!studentId || !["validate", "reject"].includes(action)) {
    return NextResponse.json(
      { error: "Demande invalide." },
      { status: 400 }
    );
  }

  if (action === "validate") {
    const { data, error } = await admin
      .from("students")
      .update({
        registration_status: "validated",
        validated_at: new Date().toISOString(),
        rejected_at: null,
      })
      .eq("id", studentId)
      .eq("registration_status", "pending")
      .select("id, first_name, last_name, class_id, registration_status")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    try {
      await createMissingFichesForStudent(admin, data.id, data.class_id);
    } catch (ficheError) {
      return NextResponse.json(
        {
          error:
            ficheError instanceof Error
              ? ficheError.message
              : "Inscription validée, mais génération des fiches impossible.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Inscription validée. Les 3 fiches E31 et les 4 fiches E32 ont été générées.",
      student: data,
    });
  }

  const { data: student, error: studentError } = await admin
    .from("students")
    .select("id, user_id")
    .eq("id", studentId)
    .eq("registration_status", "pending")
    .single();

  if (studentError || !student) {
    return NextResponse.json(
      { error: studentError?.message ?? "Élève introuvable." },
      { status: 500 }
    );
  }

  const { error: updateError } = await admin
    .from("students")
    .update({
      registration_status: "rejected",
      rejected_at: new Date().toISOString(),
    })
    .eq("id", studentId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (student.user_id) {
    await admin
      .from("app_users")
      .update({ is_active: false })
      .eq("id", student.user_id);
  }

  return NextResponse.json({
    message: "Inscription refusée.",
  });
}
