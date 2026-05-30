# FicheMCV+ — Description du projet

## 1. Identification du projet

**Nom du projet :** FicheMCV+  
**Porteur du projet :** Laurent Lesage  
**Nature du projet :** application web pédagogique de suivi, rédaction, accompagnement et validation des fiches CCF pour le Bac Pro Métiers du Commerce et de la Vente.

FicheMCV+ est une application destinée à accompagner les élèves et les enseignants dans la préparation, le suivi et la validation des fiches liées aux épreuves professionnelles du Bac Pro MCV, notamment E31 et E32.

## 2. Objectif général

Le projet vise à centraliser dans une interface unique :

- l’inscription des élèves par code classe ;
- la validation des inscriptions par le professeur ;
- la génération automatique des fiches attendues ;
- le suivi de l’avancement des fiches ;
- l’accompagnement des élèves par consignes et relances ;
- la gestion du workflow professeur ;
- l’export des informations utiles au suivi de classe.

L’objectif est de réduire la dispersion des documents, de sécuriser les étapes de suivi et de permettre au professeur de piloter plus efficacement l’avancement des élèves.

## 3. Publics concernés

L’application vise principalement :

- les professeurs d’Économie-Gestion intervenant en Bac Pro MCV ;
- les élèves de Bac Pro MCV ;
- les équipes pédagogiques chargées du suivi CCF ;
- à terme, des établissements scolaires ou équipes disciplinaires souhaitant disposer d’un outil structuré.

## 4. Fonctionnalités principales existantes

À ce stade, FicheMCV+ comprend notamment :

- une inscription élève autonome avec code classe ;
- une validation professeur des inscriptions ;
- une protection anti-doublon lors de l’inscription ;
- une génération automatique des fiches attendues après validation ;
- un espace professeur ;
- un espace élève ;
- un tableau de bord de suivi ;
- des indicateurs de progression ;
- des filtres de pilotage ;
- une synthèse par élève ;
- un suivi des élèves à relancer ou actifs ;
- un message de relance affiché dans l’espace élève ;
- une réinitialisation de mot de passe provisoire par le professeur ;
- un export CSV des élèves inscrits ;
- une authentification différenciée professeur / élève ;
- une première logique de traçabilité des relances pédagogiques.

## 5. Logique pédagogique

L’application repose sur une logique de suivi progressif des fiches.

Après validation, chaque élève dispose d’un ensemble attendu de fiches :

- 3 fiches E31 ;
- 4 fiches E32.

Les élèves ne créent pas librement un nombre illimité de fiches. Le système génère le jeu attendu afin de garantir un cadre pédagogique commun.

Le professeur peut ensuite suivre l’état de chaque fiche, repérer les élèves inactifs, relancer les élèves n’ayant pas commencé et accompagner les corrections.

## 6. Principes métier importants

Les principes suivants structurent le projet :

- une fiche archivée ne doit jamais perdre son contenu ;
- une fiche archivée reste consultable en lecture seule ;
- les élèves ne peuvent modifier que les fiches dans un état autorisé ;
- les professeurs gardent le contrôle de la validation des inscriptions ;
- les professeurs sont créés par un administrateur, sans inscription libre publique ;
- l’inscription élève est protégée contre les doublons dans une même classe ;
- le suivi professeur doit rester lisible, synthétique et exploitable en situation réelle.

## 7. Architecture générale

FicheMCV+ repose actuellement sur :

- une application Next.js ;
- une base Supabase PostgreSQL ;
- Supabase Auth pour la gestion des comptes ;
- un déploiement en ligne via GitHub / Vercel ;
- une orientation future Progressive Web App.

L’application distingue :

- l’identité de connexion, liée à `auth.users` et `app_users` ;
- le profil pédagogique de l’élève, lié à `students` ;
- les fiches et sections de fiches, liées aux tables métier.

## 8. État actuel du développement

Le projet est fonctionnel en version de test réel avec une classe pilote.

Les développements récents ont porté sur :

- le nettoyage des données fictives ;
- la réparation de profils élèves ;
- la sécurisation anti-doublon ;
- l’amélioration du dashboard professeur ;
- le suivi terrain des élèves ;
- les relances pédagogiques ;
- l’export CSV ;
- la stabilisation de la navigation professeur / élève.

## 9. Évolutions envisagées

Les évolutions prévues incluent notamment :

- une interface administrateur protégée ;
- la gestion des professeurs ;
- la gestion avancée des classes ;
- l’historique complet des relances ;
- la traçabilité de lecture des relances par les élèves ;
- une version PWA optimisée ;
- une possible extension vers d’autres épreuves ou formations, notamment BTS ;
- une réflexion ultérieure sur le dépôt de marque et la diffusion du produit.

## 10. Objet du présent dossier

Ce dossier vise à constituer une preuve d’antériorité du projet FicheMCV+, de sa logique fonctionnelle, de ses règles métier, de son architecture et de son état de développement à la date de constitution du dossier.

Il pourra servir de base à un dépôt e-Soleau, à une documentation de propriété intellectuelle, ou à une présentation structurée du projet.
