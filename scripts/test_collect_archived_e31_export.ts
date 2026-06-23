import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import type {
  SupabaseClient,
  WebSocketLikeConstructor,
} from "@supabase/supabase-js";
import WebSocket from "ws";

import { collectArchivedFicheExportData } from "../src/lib/exports/collectArchivedFicheExportData";
import type { ArchivedFicheExportData } from "../src/lib/exports/ficheExportTypes";

const SECTION_FIELDS: (keyof ArchivedFicheExportData)[] = [
  "context",
  "customer_need",
  "proposed_offer",
  "argumentation",
  "professional_communication",
  "conclusion",
];

const realtimeTransport =
  WebSocket as unknown as WebSocketLikeConstructor;

function getOptionalEnv(name: string): string {
  return String(process.env[name] ?? "").trim();
}

function getCliValue(name: string): string {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));

  if (inline) {
    return inline.slice(prefix.length).trim();
  }

  const index = process.argv.indexOf(`--${name}`);

  if (index >= 0) {
    return String(process.argv[index + 1] ?? "").trim();
  }

  return "";
}

function getFicheId() {
  return (
    getCliValue("fiche-id") ||
    String(process.env.FICHEMCV_EXPORT_FICHE_ID ?? "").trim()
  );
}

function listPropertiesByContent(data: ArchivedFicheExportData) {
  const filled: string[] = [];
  const empty: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (String(value ?? "").trim()) {
      filled.push(key);
    } else {
      empty.push(key);
    }
  }

  return { filled, empty };
}

async function signInTestUserIfConfigured(
  supabase: SupabaseClient,
) {
  const testEmail = getOptionalEnv("FICHEMCV_TEST_EMAIL");
  const testPassword = getOptionalEnv("FICHEMCV_TEST_PASSWORD");

  if (!testEmail && !testPassword) {
    console.log("Session utilisateur de test établie : non");
    return;
  }

  if (!testEmail || !testPassword) {
    throw new Error(
      "Authentification de test incomplète: FICHEMCV_TEST_EMAIL et FICHEMCV_TEST_PASSWORD sont nécessaires ensemble.",
    );
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (error || !data.session || !data.user) {
    throw new Error(
      "Authentification de test impossible: connexion refusée ou session utilisateur absente.",
    );
  }

  console.log("Session utilisateur de test établie : oui");
}

function formatCollectError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.startsWith("Fiche introuvable ou inaccessible:") &&
    message.includes("Cannot coerce the result to a single JSON object")
  ) {
    return [
      "Fiche non visible pour la session Supabase courante.",
      "Causes possibles: UUID inexistant, ou fiche masquée par les politiques RLS pour cet utilisateur.",
      "Erreur Supabase: aucune ligne visible pour une requête .single().",
    ].join(" ");
  }

  return message;
}

async function main() {
  loadEnvConfig(process.cwd());

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY requises.",
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      transport: realtimeTransport,
    },
  });

  await signInTestUserIfConfigured(supabase);

  const ficheId = getFicheId();

  if (!ficheId) {
    throw new Error(
      "Identifiant fiche manquant. Utiliser --fiche-id=<uuid> ou FICHEMCV_EXPORT_FICHE_ID.",
    );
  }

  const data = await collectArchivedFicheExportData(supabase, ficheId);
  const { filled, empty } = listPropertiesByContent(data);
  const filledSections = SECTION_FIELDS.filter((field) =>
    String(data[field] ?? "").trim(),
  );

  console.log("Résumé collecte export E31-B");
  console.log(`ficheId: ${ficheId}`);
  console.log("statut: archivee (contrôlé par le collecteur)");
  console.log(`épreuve: ${data.epreuve}`);
  console.log(`option: ${data.mcv_option}`);
  console.log(
    `sections récupérées: ${filledSections.length}/${SECTION_FIELDS.length}`,
  );
  console.log(`propriétés remplies: ${filled.join(", ") || "[]"}`);
  console.log(`propriétés vides: ${empty.join(", ") || "[]"}`);
}

main().catch((error: unknown) => {
  const message = formatCollectError(error);
  console.error(`Erreur collecte export E31-B: ${message}`);
  process.exitCode = 1;
});
