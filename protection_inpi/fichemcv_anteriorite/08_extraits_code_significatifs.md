# FicheMCV+ — Extraits de code significatifs

## 1. Objet

Ce document liste les fichiers et extraits de code considérés comme significatifs pour démontrer l’originalité fonctionnelle et technique du projet FicheMCV+.

Il ne vise pas à reproduire l’intégralité du code source, mais à identifier les zones représentatives de l’application.

## 2. Inscription élève

Fichier :

`src/app/api/register-student/route.ts`

Éléments significatifs :

- réception des données d’inscription ;
- normalisation du prénom, du nom et du code classe ;
- vérification du code d’inscription ;
- création du compte Supabase Auth ;
- création de la ligne `app_users` ;
- création du profil `students` ;
- contrôle anti-doublon dans une même classe.

Intérêt :

- démontre le parcours d’inscription autonome des élèves ;
- montre la séparation entre compte de connexion et profil pédagogique.

## 3. Anti-doublon professeur / validation

Fichier :

`src/app/api/admin/student-registrations/route.ts`

Éléments significatifs :

- accès réservé au professeur ;
- liste des inscriptions en attente ;
- détection de doublons probables ;
- blocage de validation si doublon réel ;
- validation d’un élève ;
- génération des fiches attendues après validation ;
- refus d’une inscription.

Intérêt :

- démontre le contrôle professeur ;
- protège la cohérence des données élèves.

## 4. Génération des fiches

Fichier à référencer :

`src/app/api/admin/student-registrations/route.ts`

Éléments significatifs :

- création automatique des fiches après validation ;
- génération attendue de 3 fiches E31 et 4 fiches E32 ;
- prévention des doublons de fiches.

Intérêt :

- démontre la règle métier centrale : les élèves ne créent pas librement des fiches illimitées.

## 5. Dashboard professeur

Fichier :

`src/components/TeacherDashboard.tsx`

Éléments significatifs :

- synthèse globale ;
- filtres du cockpit ;
- blocs repliables ;
- synthèse par élève ;
- indicateurs “Élèves à relancer” et “Élèves actifs” ;
- filtre Tous / À relancer / Actifs ;
- suivi terrain ;
- actions professeur ;
- réinitialisation de mot de passe ;
- message de relance rapide.

Intérêt :

- démontre la logique de pilotage pédagogique ;
- montre l’interface métier principale.

## 6. Espace élève

Fichier :

`src/app/eleve/page.tsx`

Éléments significatifs :

- récupération du profil élève ;
- affichage des fiches ;
- message de relance si aucune fiche n’est commencée ;
- prévisualisation professeur ;
- affichage des statuts et scores de complétude.

Intérêt :

- démontre l’autonomie accompagnée de l’élève ;
- montre l’affichage conditionnel selon l’avancement.

## 7. Détail d’une fiche élève

Fichier :

`src/app/eleve/fiches/[id]/page.tsx`

Éléments significatifs :

- chargement d’une fiche ;
- affichage des sections ;
- règles de modification ;
- lecture seule selon statut ;
- sauvegarde des contenus.

Intérêt :

- démontre la logique de rédaction progressive ;
- prouve les règles de modification selon workflow.

## 8. Détail d’une fiche professeur

Fichier :

`src/app/fiches/[id]/page.tsx`

Éléments significatifs :

- consultation professeur ;
- actions de workflow ;
- correction ;
- validation ;
- verrouillage ;
- archivage.

Intérêt :

- démontre le cycle de traitement professeur.

## 9. Réinitialisation de mot de passe provisoire

Fichier :

`src/app/api/admin/students/reset-password/route.ts`

Éléments significatifs :

- accès réservé au professeur ;
- recherche de l’élève par `studentId` ;
- vérification du `user_id` ;
- génération d’un mot de passe temporaire ;
- mise à jour Supabase Auth ;
- retour du mot de passe provisoire au professeur.

Intérêt :

- démontre la fonction de dépannage des accès élèves ;
- illustre la distinction `student_id` / `user_id`.

## 10. Export CSV

Fichier :

`src/app/api/admin/student-registrations/export/route.ts`

Éléments significatifs :

- export des élèves inscrits ;
- jointure avec `classes` ;
- jointure avec `app_users` ;
- statut du compte actif ;
- exclusion des inscriptions rejetées.

Intérêt :

- démontre l’outillage professeur ;
- produit un export propre pour le suivi de classe.

## 11. Navigation application

Fichier :

`src/components/AppNavigation.tsx`

Éléments significatifs :

- navigation selon rôle ;
- espace professeur ;
- prévisualisation espace élève ;
- espace élève ;
- déconnexion ;
- nettoyage des sessions expirées.

Intérêt :

- démontre la séparation des espaces et la gestion du rôle utilisateur.

## 12. Gestion des classes

Fichier :

`src/components/ClassRegistrationManager.tsx`

Éléments significatifs :

- affichage des classes ;
- codes d’inscription ;
- ouverture / fermeture des inscriptions ;
- gestion du parcours d’inscription élève.

Intérêt :

- démontre le contrôle professeur / administrateur sur les inscriptions.

## 13. Inscriptions en attente

Fichier :

`src/components/PendingStudentRegistrations.tsx`

Éléments significatifs :

- affichage des élèves en attente ;
- validation ;
- refus ;
- alerte doublon probable.

Intérêt :

- démontre la supervision professeur avant entrée dans le workflow.

## 14. Fichiers Supabase

Fichiers à référencer :

- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/admin.ts`

Éléments significatifs :

- client navigateur ;
- client serveur ;
- client administrateur ;
- nettoyage du stockage Auth ;
- séparation des usages sensibles.

Intérêt :

- démontre l’architecture technique Supabase / Next.js.

## 15. Extraits SQL significatifs

Éléments à conserver dans le dossier :

- index anti-doublon sur `students` ;
- table `student_reminders` ;
- vue `teacher_fiche_dashboard` ;
- requêtes de réparation `student_id` / `user_id`.

Intérêt :

- démontre les règles de cohérence en base ;
- prouve les choix de structure métier.

## 16. Synthèse

Les fichiers listés ci-dessus constituent les zones de code les plus représentatives de FicheMCV+.

Ils démontrent :

- la logique d’inscription ;
- le contrôle professeur ;
- la génération automatique des fiches ;
- le suivi pédagogique ;
- la relance des élèves ;
- la séparation des rôles ;
- la gestion des accès ;
- la structuration des données.
