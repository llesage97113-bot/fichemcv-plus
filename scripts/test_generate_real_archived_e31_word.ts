import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import type {
  SupabaseClient,
  WebSocketLikeConstructor,
} from "@supabase/supabase-js";
import PizZip from "pizzip";
import WebSocket from "ws";

import { collectArchivedFicheExportData } from "../src/lib/exports/collectArchivedFicheExportData";
import { buildArchivedFicheFilename } from "../src/lib/exports/buildArchivedFicheFilename";
import type { ArchivedFicheExportData } from "../src/lib/exports/ficheExportTypes";
import { generateArchivedFicheDocx } from "../src/lib/exports/generateArchivedFicheDocx";

const SECTION_FIELDS: (keyof ArchivedFicheExportData)[] = [
  "context",
  "customer_need",
  "proposed_offer",
  "argumentation",
  "professional_communication",
  "conclusion",
];

const realtimeTransport = WebSocket as unknown as WebSocketLikeConstructor;

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

function buildSafeOutputPath(data: ArchivedFicheExportData): string {
  return join(process.cwd(), "tmp", "exports", "reels", buildArchivedFicheFilename(data));
}

function listEmptyProperties(data: ArchivedFicheExportData) {
  return Object.entries(data)
    .filter(([, value]) => !String(value ?? "").trim())
    .map(([key]) => key);
}

async function signInTestUserIfConfigured(supabase: SupabaseClient) {
  const testEmail = getOptionalEnv("FICHEMCV_TEST_EMAIL");
  const testPassword = getOptionalEnv("FICHEMCV_TEST_PASSWORD");

  if (!testEmail && !testPassword) {
    return "non";
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

  return "oui";
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function normalizeTextForCheck(value: string): string {
  return decodeXmlText(value).replace(/\s+/g, " ").trim();
}

function extractDocumentText(documentXml: string): string {
  return normalizeTextForCheck(documentXml.replace(/<[^>]+>/g, " "));
}

function assertDocx(
  outputPath: string,
  data: ArchivedFicheExportData,
): {
  fileSize: number;
  residualMarkers: string[];
  injectedSections: number;
} {
  if (!existsSync(outputPath)) {
    throw new Error("DOCX généré introuvable après écriture.");
  }

  const fileSize = statSync(outputPath).size;

  if (fileSize <= 0) {
    throw new Error("DOCX généré vide.");
  }

  let zip: PizZip;

  try {
    zip = new PizZip(readFileSync(outputPath));
  } catch {
    throw new Error("DOCX généré invalide: le fichier n'est pas un ZIP lisible.");
  }

  const documentXml = zip.file("word/document.xml")?.asText();

  if (!documentXml) {
    throw new Error("word/document.xml est introuvable dans le DOCX généré.");
  }

  const residualMarkers = Array.from(
    new Set(documentXml.match(/\{\{[^}]+}}/g) ?? []),
  );
  const documentText = extractDocumentText(documentXml);

  if (!documentText) {
    throw new Error("Le document généré ne contient aucun texte exploitable.");
  }

  if (!documentText.includes(normalizeTextForCheck(data.candidate_full_name))) {
    throw new Error("Le nom du candidat est absent du document généré.");
  }

  const injectedSections = SECTION_FIELDS.filter((field) => {
    const content = normalizeTextForCheck(String(data[field] ?? ""));
    return content && documentText.includes(content);
  }).length;

  if (injectedSections !== SECTION_FIELDS.length) {
    throw new Error(
      `Injection des sections incomplète: ${injectedSections}/${SECTION_FIELDS.length}.`,
    );
  }

  if (documentText.length < 100) {
    throw new Error("Le document généré semble vide ou incomplet.");
  }

  if (residualMarkers.length > 0) {
    throw new Error(
      `Marqueurs Docxtemplater résiduels détectés: ${residualMarkers.join(", ")}.`,
    );
  }

  return { fileSize, residualMarkers, injectedSections };
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

  const ficheId = getFicheId();

  if (!ficheId) {
    throw new Error(
      "Identifiant fiche manquant. Utiliser --fiche-id=<uuid> ou FICHEMCV_EXPORT_FICHE_ID.",
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

  const authenticated = await signInTestUserIfConfigured(supabase);
  const data = await collectArchivedFicheExportData(supabase, ficheId);
  const outputPath = buildSafeOutputPath(data);
  const outputDir = join(process.cwd(), "tmp", "exports", "reels");
  const generatedDocx = generateArchivedFicheDocx(data);

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputPath, generatedDocx);

  const { fileSize, residualMarkers, injectedSections } = assertDocx(
    outputPath,
    data,
  );
  const emptyProperties = listEmptyProperties(data);

  console.log("Résumé génération Word E31-B réelle");
  console.log(`ficheId: ${ficheId}`);
  console.log("authentification utilisateur de test: " + authenticated);
  console.log("statut: archivee (contrôlé par le collecteur)");
  console.log(`épreuve: ${data.epreuve}`);
  console.log(`option: ${data.mcv_option}`);
  console.log(`numéro de fiche: ${data.fiche_number}`);
  console.log(`DOCX généré: ${outputPath}`);
  console.log(`taille: ${fileSize} octets`);
  console.log(`sections injectées: ${injectedSections}/${SECTION_FIELDS.length}`);
  console.log(`propriétés vides: ${emptyProperties.join(", ") || "[]"}`);
  console.log(`marqueurs résiduels: ${residualMarkers.join(", ") || "[]"}`);
  console.log("résultat global: OK");
}

main().catch((error: unknown) => {
  const message = formatCollectError(error);
  console.error(`Erreur génération Word E31-B réelle: ${message}`);
  process.exitCode = 1;
});
