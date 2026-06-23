import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import PizZip from "pizzip";

import { generateArchivedFicheDocx } from "../src/lib/exports/generateArchivedFicheDocx";
import type { ArchivedFicheExportData } from "../src/lib/exports/ficheExportTypes";

const outputPath = join(
  process.cwd(),
  "tmp",
  "exports",
  "E31_B_TEST_FicheMCVPlus.docx",
);

const testData: ArchivedFicheExportData = {
  school_name: "Lycée Professionnel Ducharmoy - Saint-Claude/Guadeloupe",
  exam_session: "2027",
  candidate_full_name: "Élève Démonstration",
  candidate_number: "TEST-2027-001",
  class_name: "TMCVB-2027",
  epreuve: "E31",
  mcv_option: "B - Prospection clientèle et valorisation de l'offre commerciale",
  fiche_number: "1",
  fiche_title: "Conseil et vente d'un produit adapté au besoin client",
  company_name: "Entreprise Test FicheMCV+",
  pfmp_period: "Du 5 janvier au 30 janvier 2027",
  situation_date: "15 janvier 2027",
  student_role: "Conseiller de vente stagiaire",
  realization_conditions:
    "Situation réalisée en autonomie partielle, sous la supervision du tuteur, dans un espace de vente accueillant du public.",
  context:
    "La situation se déroule pendant une période de forte fréquentation, avec une clientèle locale et touristique recherchant des conseils rapides mais personnalisés.\n\nLe rayon concerné met en avant une nouvelle gamme de produits écoresponsables. L'élève doit accueillir le client, identifier précisément son besoin et proposer une solution cohérente avec le budget annoncé.\n\nLe contexte exige une posture professionnelle, une écoute active et une capacité à valoriser l'offre sans imposer un choix au client.",
  customer_need:
    "Le client souhaite acheter un produit fiable, facile à utiliser et adapté à un usage familial régulier. Il demande également des explications claires sur l'entretien, la garantie et les services associés.",
  proposed_offer:
    "L'offre proposée comprend un produit principal de milieu de gamme, une extension de garantie adaptée, ainsi qu'un service d'accompagnement après achat. Cette proposition répond au besoin exprimé tout en respectant le budget annoncé.",
  argumentation:
    "L'argumentation commence par la reformulation du besoin afin de vérifier que les attentes du client sont bien comprises.\n\nL'élève met ensuite en avant trois bénéfices principaux: la simplicité d'utilisation, la durabilité du produit et la disponibilité d'un service de suivi en magasin. Les caractéristiques techniques sont expliquées avec un vocabulaire accessible.\n\nPour traiter l'objection liée au prix, l'élève compare le coût initial avec la durée d'utilisation prévue et rappelle les avantages de la garantie. La conclusion de l'échange invite le client à confirmer son choix en toute confiance.",
  professional_communication:
    "La communication professionnelle repose sur un accueil courtois, une posture ouverte, un questionnement pertinent et une reformulation régulière. L'élève adapte son vocabulaire au niveau d'information du client et veille à maintenir un climat commercial positif.",
  conclusion:
    "La situation permet de démontrer la capacité de l'élève à analyser un besoin client et à construire une proposition commerciale cohérente.\n\nLes points réussis concernent l'écoute, la sélection de l'offre et la justification des bénéfices. Un axe de progrès porte sur la fluidité de la conclusion de vente et la présentation plus systématique des services complémentaires.\n\nCette activité est représentative des compétences attendues pour l'épreuve E31 Option B.",
  updated_at: "23 juin 2026",
  archived_at: "23 juin 2026",
};

const generatedDocx = generateArchivedFicheDocx(testData);
mkdirSync(join(process.cwd(), "tmp", "exports"), { recursive: true });
writeFileSync(outputPath, generatedDocx);

const generatedZip = new PizZip(readFileSync(outputPath));
const documentXml = generatedZip.file("word/document.xml")?.asText();

if (!documentXml) {
  throw new Error("word/document.xml est introuvable dans le DOCX généré.");
}

const residualMarkers = Array.from(
  new Set(documentXml.match(/\{\{[^}]+}}/g) ?? []),
);
const accentChecks = ["Élève", "Démonstration", "écoresponsables"];
const missingAccents = accentChecks.filter((value) => !documentXml.includes(value));

if (missingAccents.length > 0) {
  throw new Error(
    `Caractères accentués absents du document généré: ${missingAccents.join(
      ", ",
    )}`,
  );
}

console.log(`DOCX généré: ${outputPath}`);
console.log(`Taille: ${generatedDocx.byteLength} octets`);
console.log(`Fichier existe: ${existsSync(outputPath) ? "oui" : "non"}`);
console.log(
  `Marqueurs résiduels: ${
    residualMarkers.length > 0 ? residualMarkers.join(", ") : "[]"
  }`,
);
