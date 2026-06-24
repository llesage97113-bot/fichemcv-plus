import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

import PizZip from "pizzip";

import { stripFicheTitlePrefixForWord } from "../src/lib/exports/collectArchivedOptionAFicheExportData";
import { generateArchivedWordDocx } from "../src/lib/exports/generateArchivedWordDocx";
import type { ArchivedOptionAFicheExportData } from "../src/lib/exports/ficheExportTypes";

const outputPath = join(
  process.cwd(),
  "tmp",
  "exports",
  "E32_A_TEST_FicheMCVPlus.docx",
);
const templatePath = join(
  process.cwd(),
  "templates",
  "word",
  "E32_A_fiche_archived.docx",
);

const narrativeFields: (keyof ArchivedOptionAFicheExportData)[] = [
  "context",
  "location",
  "activity_objective",
  "actors",
  "activity_description",
  "results",
  "improvement_proposals",
  "personal_review",
];

const storedTitle = "E32-4 — Assurer le suivi d’une commande client";
const testData: ArchivedOptionAFicheExportData = {
  school_name: "Lycée Professionnel Démonstration - Guadeloupe",
  exam_session: "2027",
  candidate_full_name: "Élève Option Fictive",
  candidate_number: "A-TEST-004",
  class_name: "TMCVA-TEST",
  epreuve: "E32",
  mcv_option: "A",
  fiche_number: "4",
  fiche_title: stripFicheTitlePrefixForWord(storedTitle),
  company_name: "Service Client Fictif Caraïbes",
  pfmp_period: "Du 2 mars au 27 mars 2027",
  situation_date: "13 mars 2027",
  student_role: "Assistant commercial stagiaire",
  realization_conditions:
    "Situation fictive conduite à partir d'un dossier client simulé, avec accès à un historique de commande et à une messagerie professionnelle de test.",
  context:
    "La situation concerne le suivi d'une commande passée par un client professionnel fictif.\n\nLe délai annoncé approche et le client souhaite obtenir une information fiable, claire et rassurante avant l'organisation de son événement.",
  location:
    "L'activité est réalisée dans un bureau commercial simulé, avec un poste informatique, un téléphone et une base client fictive.\n\nLe cadre permet de tester des informations longues sans modifier la mise en page du document.",
  activity_objective:
    "L'objectif est de contrôler l'état de la commande, d'informer le client et de proposer une solution si un retard est confirmé.\n\nL'élève doit sécuriser la relation client tout en respectant les informations disponibles.",
  actors:
    "Les acteurs sont le client professionnel fictif, l'élève en charge du suivi, le référent logistique et le tuteur.\n\nLe client exprime une inquiétude, tandis que l'élève doit structurer une réponse précise.",
  activity_description:
    "L'élève consulte le dossier, vérifie les dates, contacte le service logistique puis prépare un message de suivi.\n\nIl reformule la demande du client, annonce les informations confirmées et évite toute promesse non vérifiée.",
  results:
    "Le client reçoit une réponse claire avec une date actualisée et une solution alternative si nécessaire.\n\nLa relation commerciale est maintenue grâce à une information transparente et à une posture orientée solution.",
  improvement_proposals:
    "L'amélioration proposée consiste à créer une alerte automatique avant les échéances sensibles.\n\nUne autre piste consiste à rédiger un modèle de message pour les retards afin d'éviter les oublis et les formulations ambiguës.",
  personal_review:
    "Le bilan personnel souligne une bonne organisation de l'information et une communication professionnelle.\n\nL'élève doit encore progresser dans l'anticipation des risques et dans la prise de notes pendant l'appel.",
  updated_at: "23 juin 2026",
  archived_at: "24 juin 2026",
};

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

const generatedDocx = generateArchivedWordDocx(testData, templatePath);
mkdirSync(join(process.cwd(), "tmp", "exports"), { recursive: true });
writeFileSync(outputPath, generatedDocx);

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

const documentText = extractDocumentText(documentXml);
const missingSections = narrativeFields.filter((field) => {
  const content = normalizeTextForCheck(String(testData[field] ?? ""));
  return !content || !documentText.includes(content);
});

if (missingSections.length > 0) {
  throw new Error(
    `Contenus E32-A absents du document généré: ${missingSections.join(", ")}.`,
  );
}

if (documentText.includes(storedTitle)) {
  throw new Error("Le titre injecté contient encore le préfixe stocké.");
}

if (!documentText.includes("E32.4") || !documentText.includes(testData.fiche_title)) {
  throw new Error("Le titre final E32-A attendu est absent du document.");
}

execFileSync("textutil", ["-convert", "txt", "-stdout", outputPath], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

console.log("Résumé génération Word E32-A fictive");
console.log(`DOCX généré: ${outputPath}`);
console.log(`taille: ${fileSize} octets`);
console.log(`ZIP valide: oui`);
console.log(`word/document.xml présent: oui`);
console.log(`sections E32-A injectées: ${narrativeFields.length}/${narrativeFields.length}`);
console.log("titre nettoyé: oui");
console.log("ouverture textutil: OK");
console.log("marqueurs résiduels: []");
console.log("résultat global: OK");
