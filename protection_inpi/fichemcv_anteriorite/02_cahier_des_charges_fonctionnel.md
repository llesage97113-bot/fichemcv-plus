# FicheMCV+ — Cahier des charges fonctionnel

## 1. Objet du cahier des charges

Ce document décrit les fonctionnalités principales de FicheMCV+, application web destinée au suivi, à la rédaction, à l’accompagnement et à la validation des fiches CCF liées au Bac Pro Métiers du Commerce et de la Vente.

Le cahier des charges vise à formaliser les besoins fonctionnels, les rôles utilisateurs, les parcours principaux, les règles métier et les principes de fonctionnement de l’application.

## 2. Rôles utilisateurs

### 2.1 Élève

L’élève peut :

- créer son compte via un code classe ;
- accéder à son espace personnel après validation par le professeur ;
- consulter ses fiches ;
- compléter les fiches autorisées ;
- lire les consignes professeur ;
- consulter l’état d’avancement de ses fiches ;
- recevoir des messages de relance affichés dans son espace élève ;
- soumettre ses fiches lorsque le travail est prêt.

L’élève ne peut pas :

- créer librement un nombre illimité de fiches ;
- modifier une fiche soumise, corrigée, validée, verrouillée ou archivée ;
- accéder aux fiches d’un autre élève ;
- accéder à l’espace professeur.

### 2.2 Professeur

Le professeur peut :

- accéder au dashboard professeur ;
- visualiser les élèves inscrits ;
- valider ou refuser les inscriptions élèves ;
- consulter les fiches de chaque élève ;
- suivre l’avancement global et individuel ;
- repérer les élèves actifs ou à relancer ;
- prévisualiser l’espace élève ;
- réinitialiser un mot de passe provisoire ;
- copier un message de relance ;
- exporter les élèves inscrits en CSV ;
- agir sur le workflow des fiches selon leur état.

Le professeur ne s’inscrit pas librement dans l’application. Son compte est créé par un administrateur.

### 2.3 Administrateur

À ce stade, le rôle administrateur est prévu dans la roadmap.

L’administrateur devra pouvoir, à terme :

- créer un professeur ;
- activer ou désactiver un professeur ;
- gérer les classes ;
- gérer les accès ;
- superviser les usages ;
- préparer une éventuelle diffusion à d’autres établissements.

## 3. Parcours d’inscription élève

### 3.1 Inscription autonome

L’élève accède à une page d’inscription dédiée.

Il renseigne :

- son prénom ;
- son nom ;
- le code classe transmis par le professeur ;
- un mot de passe ;
- la confirmation du mot de passe.

Le système vérifie :

- que les champs obligatoires sont remplis ;
- que le mot de passe respecte la longueur minimale ;
- que les deux mots de passe correspondent ;
- que le code classe est valide ;
- que les inscriptions sont ouvertes pour la classe ;
- qu’un élève portant le même prénom et le même nom n’existe pas déjà dans cette classe.

### 3.2 Anti-doublon

L’inscription est protégée contre les doublons.

Deux niveaux de protection sont prévus :

- contrôle applicatif dans la route d’inscription ;
- contrainte ou index unique côté base Supabase sur la combinaison classe / prénom / nom normalisés.

En cas de doublon, l’élève est guidé vers la connexion au lieu de refaire une inscription.

### 3.3 Attente de validation

Après inscription, l’élève est placé en attente de validation.

Il ne dispose pas encore de ses fiches tant que le professeur n’a pas validé l’inscription.

## 4. Validation professeur

Le professeur consulte les inscriptions en attente.

Pour chaque inscription, il peut :

- valider ;
- refuser.

Lors de la validation :

- le statut de l’élève passe à `validated` ;
- la date de validation est enregistrée ;
- les fiches attendues sont générées si elles n’existent pas encore.

Lors du refus :

- le statut de l’élève passe à `rejected` ;
- le compte applicatif peut être désactivé ;
- l’élève refusé est exclu de l’export courant des élèves inscrits.

## 5. Génération des fiches

Après validation, le système génère automatiquement :

- 3 fiches E31 ;
- 4 fiches E32.

L’élève ne crée pas librement ses fiches.

Cette règle garantit que tous les élèves disposent du même cadre de travail et évite la création incontrôlée de fiches en doublon.

## 6. Structure des fiches

Chaque fiche contient :

- une épreuve ;
- un numéro de fiche ;
- un titre ;
- un statut ;
- un score de complétude ;
- un statut qualité ;
- des sections de contenu ;
- une date de mise à jour ;
- des informations de suivi.

Les sections sont adaptées à l’épreuve concernée.

## 7. Statuts des fiches

Les statuts utilisés permettent de suivre le cycle de vie d’une fiche.

Exemples de statuts :

- `brouillon` ;
- `soumise` ;
- `a_corriger` ;
- `corrigee` ;
- `validee` ;
- `verrouillee` ;
- `archivee`.

## 8. Règles de modification

L’élève peut modifier uniquement les fiches dans les états autorisés.

Les états modifiables sont notamment :

- `brouillon` ;
- `a_corriger`.

Les états non modifiables sont notamment :

- `soumise` ;
- `corrigee` ;
- `validee` ;
- `verrouillee` ;
- `archivee`.

Une fiche archivée ne doit jamais perdre son contenu. Elle reste consultable en lecture seule.

## 9. Dashboard professeur

Le dashboard professeur permet de piloter l’avancement de la classe.

Il comprend notamment :

- une synthèse générale ;
- un suivi des fiches ;
- des filtres repliables ;
- une synthèse par élève ;
- un compteur des élèves à relancer ;
- un compteur des élèves actifs ;
- un filtre Tous / À relancer / Actifs ;
- des messages de relance rapide ;
- une prévisualisation de l’espace élève ;
- une action de réinitialisation de mot de passe provisoire.

Le dashboard est conçu pour rester lisible et utilisable en situation réelle.

## 10. Suivi terrain des élèves

Le système distingue :

- les élèves actifs, ayant commencé au moins une fiche ;
- les élèves à relancer, n’ayant commencé aucune fiche.

Un encadré de relance peut être affiché automatiquement dans l’espace élève lorsque l’élève n’a encore commencé aucune fiche.

Le professeur peut également copier un message de relance rapide pour une communication externe.

## 11. Réinitialisation de mot de passe

Le professeur peut réinitialiser le mot de passe d’un élève depuis le dashboard.

Le système :

- reçoit l’identifiant pédagogique de l’élève ;
- vérifie que l’élève est rattaché à un compte utilisateur ;
- génère un mot de passe provisoire ;
- met à jour le mot de passe côté Supabase Auth ;
- affiche le mot de passe provisoire au professeur.

Le mot de passe provisoire n’est pas envoyé automatiquement à l’élève. Le professeur le transmet par le canal approprié.

## 12. Export CSV

Le professeur peut exporter les élèves inscrits au format CSV.

L’export courant exclut les inscriptions rejetées afin de rester exploitable.

L’export contient notamment :

- classe ;
- année scolaire ;
- nom ;
- prénom ;
- identifiant de connexion ;
- code élève ;
- statut ;
- compte actif ;
- date d’inscription ;
- date de validation.

## 13. Relances pédagogiques

Une première logique de relance pédagogique est prévue.

Elle comprend :

- un message visible dans l’espace élève lorsqu’aucune fiche n’est commencée ;
- un indicateur professeur signalant que le message est visible ;
- une table `student_reminders` destinée à l’historique futur des relances.

À terme, les relances pourront intégrer :

- l’historique par élève ;
- l’état vu / non vu ;
- la date de lecture ;
- la traçabilité du professeur à l’origine de la relance.

## 14. Gestion des professeurs

Les professeurs ne disposent pas d’une inscription publique.

Ils sont créés de manière contrôlée par l’administrateur via Supabase, puis rattachés au rôle professeur.

Cette règle limite les risques d’accès non autorisé aux données élèves et aux fonctions de validation.

## 15. Principes de sécurité fonctionnelle

Le projet repose sur plusieurs principes :

- séparation des rôles professeur / élève ;
- validation obligatoire des élèves ;
- protection anti-doublon ;
- désactivation possible des comptes ;
- accès professeur réservé ;
- accès élève limité à son propre espace ;
- export maîtrisé ;
- données de test nettoyées avant usage réel.

## 16. Objectifs futurs

Les évolutions envisagées comprennent :

- interface administrateur ;
- gestion avancée des professeurs ;
- rattachement professeur / classes ;
- historique complet des relances ;
- notifications internes ;
- amélioration PWA ;
- export enrichi ;
- extension à d’autres épreuves ;
- version spécifique BTS ;
- préparation d’une diffusion plus large.
