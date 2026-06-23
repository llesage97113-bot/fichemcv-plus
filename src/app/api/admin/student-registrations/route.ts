import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type McvOption = "A" | "B";

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

function normalizeStudentNameKey(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getRegistrationClass(registration: {
  classes?:
    | {
        id?: string | null;
        name?: string | null;
        school_year?: string | null;
        level?: string | null;
      }
    | {
        id?: string | null;
        name?: string | null;
        school_year?: string | null;
        level?: string | null;
      }[]
    | null;
}) {
  if (Array.isArray(registration.classes)) {
    return registration.classes[0] ?? null;
  }

  return registration.classes ?? null;
}

async function getTeacherClassIds(
  admin: ReturnType<typeof createAdminClient>,
  teacherEmail: string | null | undefined
) {
  const { data: appUser } = await admin
    .from("app_users")
    .select("id")
    .eq("email", teacherEmail ?? "")
    .eq("role", "teacher")
    .eq("is_active", true)
    .single();

  const { data: teacherProfile } = appUser
    ? await admin
        .from("teachers")
        .select("id")
        .eq("user_id", appUser.id)
        .single()
    : { data: null };

  const { data: teacherClasses } = teacherProfile
    ? await admin
        .from("class_teachers")
        .select("class_id")
        .eq("teacher_id", teacherProfile.id)
    : { data: null };

  return Array.from(
    new Set(
      (teacherClasses ?? [])
        .map((item) => String(item.class_id ?? ""))
        .filter(Boolean)
    )
  );
}

function isTeacherAllowedForClass(
  teacherClassIds: string[],
  classId: string | null | undefined
) {
  return Boolean(classId) && teacherClassIds.includes(String(classId));
}

function isMcvOption(value: string | null | undefined): value is McvOption {
  return value === "A" || value === "B";
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
  classId: string | null,
  mcvOption: McvOption
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
      mcv_option: mcvOption,
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
  const teacherClassIds = await getTeacherClassIds(admin, teacher.email);

  let registrationsQuery = admin
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

  if (teacherClassIds.length > 0) {
    registrationsQuery = registrationsQuery.in("class_id", teacherClassIds);
  } else {
    registrationsQuery = registrationsQuery.eq(
      "class_id",
      "00000000-0000-0000-0000-000000000000"
    );
  }

  const { data, error } = await registrationsQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pendingRegistrations = data ?? [];
  const classIds = Array.from(
    new Set(
      pendingRegistrations
        .map((registration) => getRegistrationClass(registration)?.id)
        .filter((classId): classId is string => Boolean(classId))
    )
  );

  const { data: classStudents, error: classStudentsError } =
    classIds.length > 0
      ? await admin
          .from("students")
          .select("id, class_id, first_name, last_name, registration_status, created_at")
          .in("class_id", classIds)
      : { data: null, error: null };

  if (classStudentsError) {
    return NextResponse.json(
      { error: classStudentsError.message },
      { status: 500 }
    );
  }

  const registrations = pendingRegistrations.map((registration) => {
    const firstNameKey = normalizeStudentNameKey(registration.first_name);
    const lastNameKey = normalizeStudentNameKey(registration.last_name);
    const registrationClass = getRegistrationClass(registration);
    const classId = registrationClass?.id ?? null;

    const duplicate = (classStudents ?? []).find((student) => {
      if (student.id === registration.id) {
        return false;
      }

      return (
        student.class_id === classId &&
        normalizeStudentNameKey(student.first_name) === firstNameKey &&
        normalizeStudentNameKey(student.last_name) === lastNameKey &&
        student.registration_status !== "rejected"
      );
    });

    return {
      ...registration,
      possible_duplicate: Boolean(duplicate),
      duplicate_student_id: duplicate?.id ?? null,
      duplicate_registration_status: duplicate?.registration_status ?? null,
      duplicate_created_at: duplicate?.created_at ?? null,
    };
  });

  return NextResponse.json({ registrations });
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
  const teacherClassIds = await getTeacherClassIds(admin, teacher.email);
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
    const { data: pendingStudent, error: pendingStudentError } = await admin
      .from("students")
      .select("id, first_name, last_name, class_id, registration_status")
      .eq("id", studentId)
      .eq("registration_status", "pending")
      .single();

    if (pendingStudentError || !pendingStudent) {
      return NextResponse.json(
        {
          error:
            pendingStudentError?.message ??
            "Inscription en attente introuvable.",
        },
        { status: 500 }
      );
    }

    if (!isTeacherAllowedForClass(teacherClassIds, pendingStudent.class_id)) {
      return NextResponse.json(
        {
          error:
            "Action refusée : cette inscription appartient à une classe qui ne vous est pas rattachée.",
        },
        { status: 403 }
      );
    }

    const { data: registrationClass, error: registrationClassError } =
      await admin
        .from("classes")
        .select("id, mcv_option")
        .eq("id", pendingStudent.class_id)
        .single();

    if (registrationClassError || !registrationClass) {
      return NextResponse.json(
        {
          error:
            registrationClassError?.message ??
            "Classe associée à l’inscription introuvable.",
        },
        { status: 500 }
      );
    }

    if (!isMcvOption(registrationClass.mcv_option)) {
      return NextResponse.json(
        {
          error:
            "L’option MCV de la classe doit être renseignée avant de valider cet élève.",
        },
        { status: 400 }
      );
    }

    const { data: existingStudents, error: existingStudentsError } = await admin
      .from("students")
      .select("id, first_name, last_name, registration_status")
      .eq("class_id", pendingStudent.class_id);

    if (existingStudentsError) {
      return NextResponse.json(
        { error: existingStudentsError.message },
        { status: 500 }
      );
    }

    const firstNameKey = normalizeStudentNameKey(pendingStudent.first_name);
    const lastNameKey = normalizeStudentNameKey(pendingStudent.last_name);

    const duplicateStudent = (existingStudents ?? []).find((student) => {
      if (student.id === pendingStudent.id) {
        return false;
      }

      return (
        normalizeStudentNameKey(student.first_name) === firstNameKey &&
        normalizeStudentNameKey(student.last_name) === lastNameKey &&
        student.registration_status !== "rejected"
      );
    });

    if (duplicateStudent) {
      return NextResponse.json(
        {
          error:
            "Validation bloquée : un élève portant le même prénom et le même nom existe déjà dans cette classe.",
        },
        { status: 409 }
      );
    }

    const { data, error } = await admin
      .from("students")
      .update({
        registration_status: "validated",
        validated_at: new Date().toISOString(),
        rejected_at: null,
        mcv_option: registrationClass.mcv_option,
      })
      .eq("id", studentId)
      .eq("registration_status", "pending")
      .select("id, first_name, last_name, class_id, registration_status, mcv_option")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    try {
      if (!isMcvOption(data.mcv_option)) {
        throw new Error(
          "L’option MCV de l’élève doit être renseignée avant de générer les fiches."
        );
      }

      await createMissingFichesForStudent(
        admin,
        data.id,
        data.class_id,
        data.mcv_option
      );
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
    .select("id, user_id, class_id")
    .eq("id", studentId)
    .eq("registration_status", "pending")
    .single();

  if (studentError || !student) {
    return NextResponse.json(
      { error: studentError?.message ?? "Élève introuvable." },
      { status: 500 }
    );
  }

  if (!isTeacherAllowedForClass(teacherClassIds, student.class_id)) {
    return NextResponse.json(
      {
        error:
          "Action refusée : cette inscription appartient à une classe qui ne vous est pas rattachée.",
      },
      { status: 403 }
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
