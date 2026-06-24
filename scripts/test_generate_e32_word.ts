import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import PizZip from "pizzip";

import { generateArchivedE32FicheDocx } from "../src/lib/exports/generateArchivedE32FicheDocx";
import type { ArchivedE32FicheExportData } from "../src/lib/exports/ficheExportTypes";

const outputPath = join(
  process.cwd(),
  "tmp",
  "exports",
  "E32_B_TEST_FicheMCVPlus.docx",
);

const sectionFields: (keyof ArchivedE32FicheExportData)[] = [
  "context_suivi",
  "order_follow_up",
  "associated_services",
  "returns_or_complaints",
  "customer_solution",
  "customer_satisfaction",
  "satisfaction_improvement",
  "professional_communication",
  "conclusion",
];

const testData: ArchivedE32FicheExportData = {
  school_name: "Lycée Professionnel Démonstration - Guadeloupe",
  exam_session: "2027",
  candidate_full_name: "Prénom Test Nom Test",
  candidate_number: "",
  class_name: "TMCVB-TEST",
  epreuve: "E32",
  mcv_option: "B - Prospection clientèle et valorisation de l'offre commerciale",
  fiche_number: "1",
  fiche_title: "Suivi d'une commande et traitement de la satisfaction client",
  company_name: "Entreprise Fictive FicheMCV+",
  pfmp_period: "Du 2 mars au 27 mars 2027",
  situation_date: "12 mars 2027",
  student_role: "Assistant commercial stagiaire",
  realization_conditions:
    "Situation réalisée avec un dossier client fictif, sous supervision pédagogique, dans un contexte de suivi après-vente simulé.",
  context_suivi:
    "Le client a validé une commande de produits destinés à une opération commerciale locale.\n\nLe suivi porte sur la disponibilité des articles, le respect du délai annoncé et la qualité des informations transmises au client.",
  order_follow_up:
    "La commande est contrôlée à partir du bon de commande, du stock disponible et du planning de livraison.\n\nUn message de confirmation est préparé afin d'informer le client de l'avancement.",
  associated_services:
    "Les services associés proposés concernent la livraison, la mise à disposition en point de vente et l'assistance après achat.\n\nCes services sont présentés comme des solutions facilitant l'utilisation du produit.",
  returns_or_complaints:
    "Une réclamation fictive porte sur un retard de livraison annoncé par le transporteur.\n\nL'élève identifie la demande, reformule le motif d'insatisfaction et recherche les informations nécessaires avant de répondre.",
  customer_solution:
    "La solution proposée consiste à prévenir le client, confirmer une nouvelle date fiable et proposer un retrait prioritaire si cette option lui convient.",
  customer_satisfaction:
    "La satisfaction client est vérifiée par une question de contrôle en fin d'échange et par la confirmation que la solution proposée répond à son besoin immédiat.",
  satisfaction_improvement:
    "Pour améliorer la satisfaction, l'élève propose de mieux anticiper les informations de livraison et de préparer un message type pour les retards signalés.",
  professional_communication:
    "La communication professionnelle reste courtoise, précise et orientée solution.\n\nL'élève utilise un vocabulaire adapté, évite les promesses incertaines et conserve une trace écrite de l'échange.",
  conclusion:
    "Cette situation permet de montrer la capacité à suivre une commande, traiter une insatisfaction et maintenir une relation commerciale positive.\n\nLes points forts sont la reformulation, la recherche d'information et la proposition d'une solution réaliste.",
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

const generatedDocx = generateArchivedE32FicheDocx(testData);
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
const missingSections = sectionFields.filter((field) => {
  const content = normalizeTextForCheck(String(testData[field] ?? ""));
  return !content || !documentText.includes(content);
});

if (missingSections.length > 0) {
  throw new Error(
    `Contenus E32-B absents du document généré: ${missingSections.join(", ")}.`,
  );
}

console.log("Résumé génération Word E32-B fictive");
console.log(`DOCX généré: ${outputPath}`);
console.log(`taille: ${fileSize} octets`);
console.log(`ZIP valide: oui`);
console.log(`word/document.xml présent: oui`);
console.log(`sections E32-B injectées: ${sectionFields.length}/${sectionFields.length}`);
console.log(`marqueurs résiduels: []`);
console.log("résultat global: OK");
