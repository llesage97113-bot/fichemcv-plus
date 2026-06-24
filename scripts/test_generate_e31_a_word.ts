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
  "E31_A_TEST_FicheMCVPlus.docx",
);
const templatePath = join(
  process.cwd(),
  "templates",
  "word",
  "E31_A_fiche_archived.docx",
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

const storedTitle = "E31-1 — Réaliser une vente-conseil";
const testData: ArchivedOptionAFicheExportData = {
  school_name: "Lycée Professionnel Démonstration - Guadeloupe",
  exam_session: "2027",
  candidate_full_name: "Prénom Fictif Nom Fictif",
  candidate_number: "A-TEST-001",
  class_name: "TMCVA-TEST",
  epreuve: "E31",
  mcv_option: "A",
  fiche_number: "1",
  fiche_title: stripFicheTitlePrefixForWord(storedTitle),
  company_name: "Boutique Fictive des Îles",
  pfmp_period: "Du 5 janvier au 30 janvier 2027",
  situation_date: "16 janvier 2027",
  student_role: "Conseiller de vente stagiaire",
  realization_conditions:
    "Situation fictive réalisée en autonomie partielle, avec observation du tuteur et accès à une documentation commerciale simulée.",
  context:
    "La situation se déroule dans un espace de vente fictif spécialisé dans les produits d'équipement de la maison.\n\nUne cliente recherche un article durable, simple à utiliser et adapté à un budget maîtrisé. L'activité demande d'écouter, de questionner et de reformuler sans interrompre l'échange.",
  location:
    "L'activité a lieu dans la zone conseil du magasin, à proximité d'un présentoir saisonnier.\n\nLe lieu est volontairement décrit avec des repères précis afin de tester l'insertion de paragraphes longs dans le template.",
  activity_objective:
    "L'objectif est d'accompagner la cliente vers une solution adaptée, de vérifier son besoin réel et de présenter une offre cohérente avec ses contraintes.\n\nL'élève doit aussi montrer une posture professionnelle et une communication claire.",
  actors:
    "Les acteurs sont la cliente fictive, l'élève en rôle de conseiller, le tuteur pédagogique et un responsable de rayon.\n\nChaque acteur intervient dans un cadre limité pour conserver une situation réaliste et lisible.",
  activity_description:
    "L'élève accueille la cliente, pose des questions ouvertes, reformule les attentes puis compare deux produits.\n\nIl explique les avantages, les limites et les services associés avec un vocabulaire accessible. L'apostrophe dans l'expression l'offre proposée doit rester intacte.",
  results:
    "La cliente identifie le produit qui répond le mieux à son besoin et comprend les conditions de garantie.\n\nLe résultat attendu est une décision argumentée, sans pression commerciale, avec une trace écrite fictive de l'échange.",
  improvement_proposals:
    "Pour améliorer l'activité, l'élève propose de préparer une grille de découverte du besoin et une fiche mémo sur les objections fréquentes.\n\nUne deuxième piste consiste à mieux hiérarchiser les arguments selon le budget annoncé.",
  personal_review:
    "Le bilan personnel met en évidence une écoute active et une reformulation correcte.\n\nL'élève doit encore gagner en fluidité dans la conclusion de vente et dans la présentation des services complémentaires.",
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
    `Contenus E31-A absents du document généré: ${missingSections.join(", ")}.`,
  );
}

if (documentText.includes(storedTitle)) {
  throw new Error("Le titre injecté contient encore le préfixe stocké.");
}

if (!documentText.includes("E31.1") || !documentText.includes(testData.fiche_title)) {
  throw new Error("Le titre final E31-A attendu est absent du document.");
}

execFileSync("textutil", ["-convert", "txt", "-stdout", outputPath], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

console.log("Résumé génération Word E31-A fictive");
console.log(`DOCX généré: ${outputPath}`);
console.log(`taille: ${fileSize} octets`);
console.log(`ZIP valide: oui`);
console.log(`word/document.xml présent: oui`);
console.log(`sections E31-A injectées: ${narrativeFields.length}/${narrativeFields.length}`);
console.log("titre nettoyé: oui");
console.log("ouverture textutil: OK");
console.log("marqueurs résiduels: []");
console.log("résultat global: OK");
