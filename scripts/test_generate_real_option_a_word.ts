import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import PizZip from "pizzip";
import WebSocket from "ws";

import { buildArchivedFicheFilename } from "../src/lib/exports/buildArchivedFicheFilename";
import { collectArchivedOptionAFicheExportData } from "../src/lib/exports/collectArchivedOptionAFicheExportData";
import { generateArchivedWordDocx } from "../src/lib/exports/generateArchivedWordDocx";

const ficheId = process.argv[2];

if (!ficheId) {
  throw new Error("Usage: node test_generate_real_option_a_word.js <ficheId>");
}

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Variables Supabase manquantes.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  realtime: {
    transport: WebSocket as never,
  },
});

function assertDocx(outputPath: string) {
  if (!existsSync(outputPath)) {
    throw new Error("DOCX généré introuvable après écriture.");
  }

  const fileSize = statSync(outputPath).size;

  if (fileSize <= 0) {
    throw new Error("DOCX généré vide.");
  }

  let generatedZip: PizZip;

  try {
    generatedZip = new PizZip(readFileSync(outputPath));
  } catch {
    throw new Error("DOCX généré invalide: le fichier n'est pas un ZIP lisible.");
  }

  const documentXml = generatedZip.file("word/document.xml")?.asText();

  if (!documentXml) {
    throw new Error("word/document.xml est introuvable dans le DOCX généré.");
  }

  const residualMarkers = Array.from(
    new Set(documentXml.match(/\{\{[^}]+}}/g) ?? []),
  );

  if (residualMarkers.length > 0) {
    throw new Error(
      `Marqueurs Docxtemplater résiduels détectés: ${residualMarkers.join(", ")}.`,
    );
  }

  execFileSync("textutil", ["-convert", "txt", "-stdout", outputPath], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return fileSize;
}

async function main() {
  const data = await collectArchivedOptionAFicheExportData(supabase, ficheId);
  const templatePath = join(
    process.cwd(),
    "templates",
    "word",
    `${data.epreuve}_${data.mcv_option}_fiche_archived.docx`,
  );
  const docxBuffer = generateArchivedWordDocx(data, templatePath);
  const filename = buildArchivedFicheFilename(data);
  const outputPath = join(process.cwd(), "tmp", "exports", filename);

  mkdirSync(join(process.cwd(), "tmp", "exports"), { recursive: true });
  writeFileSync(outputPath, docxBuffer);

  const fileSize = assertDocx(outputPath);

  console.log("Résumé génération Word Option A réelle");
  console.log(`fiche: ${ficheId}`);
  console.log(`épreuve: ${data.epreuve}`);
  console.log(`option: ${data.mcv_option}`);
  console.log(`template: ${templatePath}`);
  console.log(`DOCX généré: ${outputPath}`);
  console.log(`taille: ${fileSize} octets`);
  console.log("ZIP valide: oui");
  console.log("ouverture textutil: OK");
  console.log("marqueurs résiduels: []");
  console.log("résultat global: OK");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
