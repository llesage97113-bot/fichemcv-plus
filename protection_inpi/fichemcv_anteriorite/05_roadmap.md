# FicheMCV+ — Roadmap du projet

## 1. Objet du document

Ce document présente la feuille de route du projet FicheMCV+.

Il vise à formaliser les évolutions envisagées, les priorités fonctionnelles, les orientations techniques et les perspectives de diffusion du projet.

Cette roadmap fait partie du dossier d’antériorité du projet.

## 2. Vision générale

FicheMCV+ a vocation à devenir un outil complet de suivi des fiches CCF pour le Bac Pro Métiers du Commerce et de la Vente.

Le projet vise à accompagner :

- les élèves dans la rédaction progressive de leurs fiches ;
- les professeurs dans le suivi, la relance, la correction et la validation ;
- les équipes pédagogiques dans l’organisation du CCF ;
- à terme, d’autres formations professionnelles pouvant bénéficier d’un outil similaire.

La logique directrice est de construire un outil simple, lisible, robuste et réellement utilisable en situation de classe.

## 3. État actuel du projet

À ce stade, FicheMCV+ dispose déjà d’une version fonctionnelle permettant :

- l’inscription élève par code classe ;
- la validation professeur ;
- la génération automatique de 3 fiches E31 et 4 fiches E32 ;
- l’accès à un espace professeur ;
- l’accès à un espace élève ;
- le suivi de progression des fiches ;
- la détection des élèves actifs ou à relancer ;
- l’affichage de messages de relance dans l’espace élève ;
- la réinitialisation de mots de passe provisoires ;
- l’export CSV des élèves inscrits ;
- la prévisualisation de l’espace élève par le professeur ;
- la protection contre les doublons d’inscription ;
- une première table d’historique des relances.

## 4. Priorités court terme

Les priorités court terme concernent la stabilisation de l’usage réel avec une classe pilote.

### 4.1 Stabilisation des comptes élèves

Objectifs :

- s’assurer que chaque élève validé dispose d’un compte actif ;
- garantir que chaque profil `students` est correctement relié à un `user_id` ;
- vérifier la cohérence entre `auth.users`, `app_users` et `students` ;
- faciliter la réinitialisation des mots de passe provisoires ;
- améliorer l’affichage des identifiants techniques dans le dashboard.

### 4.2 Suivi terrain des élèves

Objectifs :

- améliorer la visibilité des élèves à relancer ;
- renforcer la distinction entre élèves actifs et inactifs ;
- afficher l’historique des relances côté professeur ;
- afficher les relances non vues côté élève ;
- renseigner `seen_at` lorsqu’une relance est consultée.

### 4.3 Amélioration du dashboard professeur

Objectifs :

- conserver un dashboard léger et lisible ;
- rendre les blocs secondaires repliables ;
- améliorer les filtres ;
- renforcer les indicateurs de progression ;
- mieux hiérarchiser les actions professeur ;
- rendre les actions sensibles plus explicites.

### 4.4 Messages et relances

Objectifs :

- améliorer les messages de relance rapides ;
- ajouter un bouton permettant de copier les accès complets d’un élève ;
- conserver une trace des relances ;
- éviter les relances automatiques excessives ;
- maintenir une communication pédagogique, sobre et claire.

## 5. Priorités moyen terme

Les priorités moyen terme visent à structurer le produit et à préparer un usage plus large.

### 5.1 Interface administrateur

Créer une page `/admin` protégée.

Fonctionnalités envisagées :

- créer un professeur ;
- activer ou désactiver un professeur ;
- gérer les classes ;
- visualiser les comptes actifs ;
- rattacher un professeur à une ou plusieurs classes ;
- superviser les inscriptions ;
- préparer une gestion multi-établissements.

### 5.2 Gestion avancée des professeurs

Objectifs :

- supprimer la dépendance à une création manuelle dans Supabase ;
- créer les professeurs depuis l’application ;
- gérer les droits ;
- prévoir plusieurs niveaux de rôle ;
- distinguer professeur utilisateur et administrateur de l’application.

### 5.3 Gestion avancée des classes

Objectifs :

- créer, modifier, archiver une classe ;
- gérer les années scolaires ;
- ouvrir ou fermer les inscriptions ;
- générer un code classe ;
- exporter la liste des élèves ;
- suivre l’avancement par classe.

### 5.4 Amélioration de l’espace élève

Objectifs :

- rendre les consignes plus guidantes ;
- afficher clairement les priorités ;
- indiquer la prochaine action attendue ;
- améliorer la lisibilité des fiches ;
- faciliter la rédaction progressive ;
- rendre l’interface plus confortable sur smartphone.

### 5.5 Historique des actions

Objectifs :

- tracer les validations ;
- tracer les corrections demandées ;
- tracer les relances ;
- tracer les réinitialisations de mot de passe ;
- préparer un journal d’activité utile au professeur.

## 6. Priorités long terme

Les priorités long terme concernent l’industrialisation, la diffusion et l’extension du produit.

### 6.1 Progressive Web App

Le projet conserve une orientation PWA.

Objectifs :

- permettre une installation simple sur smartphone ;
- améliorer l’usage mobile ;
- optimiser les performances ;
- préparer éventuellement des notifications internes ;
- éviter dans un premier temps la complexité d’une application native.

La PWA est considérée comme la direction mobile prioritaire.

Une application native App Store / Play Store reste possible plus tard, après stabilisation du cœur produit.

### 6.2 Notifications

Évolutions possibles :

- notifications internes dans l’application ;
- notifications PWA ;
- rappels de travail ;
- informations de correction ;
- alertes professeur.

Les SMS ne sont pas prioritaires à ce stade en raison des coûts, des contraintes RGPD et de la sensibilité des données élèves.

### 6.3 Exports avancés

Objectifs :

- exporter les élèves actifs ;
- exporter l’historique complet ;
- exporter les fiches ;
- préparer des exports Word ou PDF ;
- produire des synthèses professeur ;
- fournir des tableaux de suivi exploitables en conseil ou en réunion pédagogique.

### 6.4 Extension à d’autres épreuves

Objectifs :

- intégrer E33 ;
- intégrer d’autres formats de fiches ;
- adapter les templates aux exigences des épreuves ;
- préparer une logique multi-épreuves.

### 6.5 Version BTS

Une version orientée BTS est envisagée comme extension future.

Elle pourrait adapter la logique de FicheMCV+ à :

- d’autres référentiels ;
- d’autres types de dossiers ;
- d’autres modalités de suivi ;
- des publics post-bac.

Cette piste est conservée comme axe de développement stratégique.

## 7. Protection et valorisation du projet

Le projet fait l’objet d’une réflexion de protection progressive.

Étapes envisagées :

- constituer un dossier d’antériorité ;
- déposer une e-Soleau ;
- sécuriser le nom FicheMCV+ ;
- envisager plus tard un dépôt de marque ;
- préparer une documentation claire du projet.

L’objectif immédiat est de documenter l’antériorité et la structure du projet avant toute diffusion plus large.

## 8. Données personnelles et RGPD

FicheMCV+ traite des données relatives aux élèves.

Les évolutions futures devront intégrer :

- minimisation des données ;
- information des utilisateurs ;
- durée de conservation ;
- sécurité des accès ;
- droits des utilisateurs ;
- traçabilité des actions ;
- hébergement et sous-traitance ;
- éventuelle validation par un DPO ou un cadre établissement.

Le projet devra rester prudent sur l’usage des notifications, des téléphones et des communications externes.

## 9. Commercialisation éventuelle

Une diffusion plus large est envisageable à terme, mais elle n’est pas immédiate.

Étapes préalables :

- stabiliser le produit ;
- tester en classe réelle ;
- documenter les usages ;
- sécuriser les données ;
- clarifier les droits ;
- préparer un modèle d’administration ;
- définir le périmètre fonctionnel ;
- évaluer les besoins d’autres enseignants ou établissements.

La commercialisation éventuelle ne doit pas précéder la stabilisation fonctionnelle et juridique du projet.

## 10. Principes directeurs de développement

Les principes suivants doivent guider la suite du développement :

- simplicité d’usage ;
- lisibilité du dashboard ;
- sécurité des données ;
- robustesse du workflow ;
- contrôle professeur ;
- autonomie accompagnée des élèves ;
- absence de complexité inutile ;
- évolution progressive ;
- priorité à l’usage réel.

## 11. Prochaines étapes concrètes

Les prochaines étapes identifiées sont :

1. finaliser l’historique des relances ;
2. afficher les relances non vues dans l’espace élève ;
3. afficher l’historique côté professeur ;
4. améliorer la copie des accès complets après réinitialisation de mot de passe ;
5. préparer l’interface administrateur ;
6. documenter les captures d’écran ;
7. compléter le dossier d’antériorité ;
8. préparer une archive pour dépôt e-Soleau.

## 12. Synthèse

FicheMCV+ est conçu comme un outil évolutif de pilotage pédagogique.

La roadmap vise à passer progressivement :

- d’un prototype fonctionnel ;
- à un outil stabilisé en usage réel ;
- puis à une solution structurée, documentée et potentiellement diffusable.

La priorité reste de construire un outil fiable, utile et compréhensible avant toute extension majeure.
