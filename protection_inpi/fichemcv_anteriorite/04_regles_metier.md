# FicheMCV+ — Règles métier

## 1. Objet du document

Ce document formalise les règles métier principales du projet FicheMCV+.

Ces règles décrivent la logique pédagogique, fonctionnelle et organisationnelle qui structure l’application. Elles constituent un élément important du dossier d’antériorité, car elles traduisent les choix spécifiques effectués pour répondre aux besoins du suivi CCF en Bac Pro Métiers du Commerce et de la Vente.

## 2. Principe général

FicheMCV+ n’est pas un simple espace de dépôt de documents.

L’application organise un parcours structuré :

- inscription de l’élève ;
- validation par le professeur ;
- génération automatique des fiches attendues ;
- rédaction progressive ;
- suivi professeur ;
- correction ;
- validation ;
- verrouillage ;
- archivage.

L’objectif est de sécuriser le suivi pédagogique et d’éviter la dispersion des fiches, les doublons, les oublis et les pertes de contenu.

## 3. Inscription élève

L’élève s’inscrit via un code classe fourni par le professeur.

L’inscription nécessite :

- prénom ;
- nom ;
- code classe ;
- mot de passe ;
- confirmation du mot de passe.

Une inscription ne donne pas immédiatement accès aux fiches. Elle crée une demande en attente de validation.

## 4. Validation professeur obligatoire

Le professeur doit valider l’inscription de l’élève.

Tant que l’élève n’est pas validé :

- il ne dispose pas pleinement de ses fiches ;
- il reste en attente ;
- il doit attendre l’action du professeur.

La validation professeur est une étape de contrôle pédagogique et administratif.

## 5. Génération automatique des fiches

Après validation, le système génère automatiquement le jeu de fiches attendu.

Pour le Bac Pro MCV, la règle actuellement retenue est :

- 3 fiches E31 ;
- 4 fiches E32.

Cette génération automatique évite que les élèves créent eux-mêmes un nombre libre de fiches.

Elle garantit un cadre commun pour tous les élèves d’une classe.

## 6. Interdiction des fiches illimitées

L’élève ne doit pas pouvoir créer librement des fiches sans limite.

Le nombre de fiches attendues dépend du cadre pédagogique et des épreuves concernées.

Cette règle permet :

- d’éviter les doublons ;
- de préserver la cohérence du suivi ;
- de faciliter le travail du professeur ;
- de préparer correctement les dossiers CCF.

## 7. Anti-doublon à l’inscription

Une même classe ne doit pas contenir deux inscriptions actives portant le même prénom et le même nom.

Le système applique une protection anti-doublon :

- dans la logique applicative ;
- dans la base de données par contrainte ou index unique.

En cas de doublon, l’élève est orienté vers la connexion plutôt que vers une nouvelle inscription.

## 8. Statuts d’inscription

Les principaux statuts d’inscription élève sont :

- pending : inscription en attente ;
- validated : inscription validée ;
- rejected : inscription refusée.

Un élève rejeté ne doit pas apparaître dans l’export courant des élèves actifs ou inscrits.

## 9. Distinction entre profil élève et compte utilisateur

FicheMCV+ distingue deux identités :

- le profil pédagogique de l’élève ;
- le compte de connexion.

Le profil pédagogique est porté par la table students.

Le compte de connexion est porté par Supabase Auth et la table app_users.

Règle métier :

- un élève validé doit disposer d’un profil students ;
- ce profil doit être rattaché à un user_id ;
- ce user_id doit correspondre à un app_user actif ;
- ce même identifiant doit correspondre à un compte Supabase Auth valide.

## 10. Règles de modification des fiches

L’élève ne peut modifier une fiche que si son statut le permet.

Les fiches modifiables sont notamment :

- brouillon ;
- a_corriger.

Les fiches non modifiables sont notamment :

- soumise ;
- corrigee ;
- validee ;
- verrouillee ;
- archivee.

Cette règle protège le travail déjà transmis ou validé.

## 11. Soumission d’une fiche

Lorsqu’un élève estime qu’une fiche est prête, il peut la soumettre.

Une fiche soumise n’est plus librement modifiable par l’élève.

Elle entre dans le circuit professeur.

## 12. Correction et retour professeur

Le professeur peut demander une correction.

Dans ce cas, la fiche passe dans un état permettant à l’élève de reprendre son travail.

L’état a_corriger signifie que l’élève doit modifier ou compléter sa fiche.

## 13. Validation d’une fiche

Une fiche validée indique que le professeur considère le travail comme recevable dans le cadre du suivi.

Une fois validée, la fiche n’est plus modifiable par l’élève.

## 14. Verrouillage

Le verrouillage marque un stade où la fiche est figée.

La fiche reste consultable, mais elle ne peut plus être modifiée.

## 15. Archivage

L’archivage est une règle métier majeure.

Une fiche archivée :

- ne doit jamais apparaître vide ;
- ne doit jamais perdre son contenu ;
- doit rester consultable ;
- doit être en lecture seule ;
- ne doit plus entrer dans le workflow de modification.

Cette règle protège la valeur probatoire et pédagogique du travail réalisé.

## 16. Complétude

Chaque fiche dispose d’un score de complétude.

Ce score permet :

- d’évaluer l’avancement ;
- d’identifier les fiches vides ;
- de repérer les fiches fragiles ;
- d’alimenter le dashboard professeur.

Un score de complétude supérieur à zéro permet de considérer qu’une fiche a été démarrée.

## 17. Suivi terrain

Le dashboard distingue :

- les élèves actifs ;
- les élèves à relancer.

Un élève actif est un élève ayant commencé au moins une fiche.

Un élève à relancer est un élève validé dont aucune fiche n’a encore été commencée.

## 18. Relance pédagogique

Lorsqu’un élève n’a commencé aucune fiche, un message de relance peut être affiché dans son espace élève.

Le message doit rester pédagogique, clair et orienté vers l’action.

Il invite l’élève à commencer une première fiche et à compléter au minimum :

- le contexte ;
- l’entreprise ;
- la situation observée ;
- les acteurs concernés.

## 19. Historique des relances

Une table student_reminders est prévue pour historiser les relances.

Elle doit permettre de conserver :

- l’élève concerné ;
- le type de relance ;
- le message ;
- la date de création ;
- l’auteur éventuel ;
- la date de lecture éventuelle.

## 20. Réinitialisation de mot de passe

Le professeur peut générer un mot de passe provisoire pour un élève.

Le mot de passe provisoire :

- est généré par l’application ;
- est transmis manuellement par le professeur ;
- n’est pas envoyé automatiquement par SMS ou email à ce stade ;
- permet à l’élève de se reconnecter.

Le student_code ne doit pas être confondu avec le mot de passe.

## 21. Export CSV

L’export CSV courant doit rester exploitable.

Il contient les élèves inscrits ou validés, mais exclut les inscriptions rejetées.

Il doit notamment afficher :

- la classe ;
- l’année scolaire ;
- le nom ;
- le prénom ;
- l’identifiant de connexion ;
- le code élève ;
- le statut ;
- l’état du compte ;
- les dates importantes.

## 22. Professeurs

Les professeurs ne s’inscrivent pas librement.

Ils sont créés par un administrateur.

Cette règle protège l’accès aux données élèves et aux actions sensibles.

## 23. Administrateur

Le rôle administrateur est prévu dans la roadmap.

Il devra permettre :

- la création des professeurs ;
- l’activation et la désactivation des comptes ;
- la gestion des classes ;
- la supervision des usages ;
- la préparation d’un déploiement plus large.

## 24. Principe de sobriété

FicheMCV+ doit rester lisible et utilisable en situation réelle.

Les informations secondaires peuvent être repliables.

Le dashboard doit privilégier :

- la synthèse ;
- l’action ;
- le repérage rapide des urgences ;
- la réduction de la charge visuelle.

## 25. Principe d’évolution

Le projet est conçu pour évoluer progressivement.

Les règles actuelles concernent principalement E31 et E32.

La logique pourra être étendue à d’autres épreuves, d’autres formations ou une version spécifique BTS.

Toute évolution doit conserver les principes fondamentaux :

- suivi structuré ;
- sécurité des données ;
- contrôle professeur ;
- lisibilité pédagogique ;
- traçabilité.
