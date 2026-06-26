# Vérification de l'adresse email de récupération

Ce parcours vérifie uniquement une ligne `user_contacts` avec
`contact_type = 'email'`. Il ne modifie pas `auth.users.email`,
`app_users.email` ou `app_users.legacy_login_email`.

## Variables d'environnement

Le transport applicatif utilise SMTP via `nodemailer`.

Variables nécessaires:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`
- `NEXT_PUBLIC_APP_URL`

`NEXT_PUBLIC_APP_URL` sert à construire le lien envoyé par email. En local, la
valeur attendue est `http://localhost:3000`. Ne pas utiliser `0.0.0.0` dans les
liens email.

## Parcours utilisateur

Depuis `/compte`, un contact email non vérifié affiche le bouton
`Envoyer le lien de vérification`. Le navigateur transmet seulement
`contactId`; l'adresse destinataire est relue côté serveur depuis
`user_contacts`.

Le lien reçu ouvre `/verify-recovery-email?token=...`. Cette page vérifie la
forme du jeton, son hash, son expiration et son état, puis affiche une
confirmation explicite. Le chargement GET ne renseigne jamais `verified_at`.

La validation se fait ensuite par POST. En cas de succès,
`user_contacts.verified_at` est renseigné et le jeton est marqué consommé.
L'utilisateur est redirigé vers `/verify-recovery-email/success`, sans jeton
dans l'URL.

## Sécurité

Le jeton brut est généré avec 32 octets aléatoires via `node:crypto`, encodés en
`base64url`. Seule son empreinte SHA-256 est stockée en base.

Durée de vie: 30 minutes.

Usage unique: la fonction SQL
`confirm_user_contact_verification_token` verrouille la ligne du jeton avec
`FOR UPDATE`, vérifie l'état et met à jour le contact et le jeton dans la même
transaction SQL.

Renvoi: avant de créer un nouveau jeton, les anciens jetons actifs du même
contact sont marqués consommés. Le dernier lien envoyé est donc le seul
utilisable.

Limitation: un nouveau lien est refusé si un jeton a déjà été créé dans les
60 dernières secondes pour ce contact. Une limite complémentaire de 5 demandes
par heure est aussi appliquée.

## États fonctionnels

- Jeton valide: page de confirmation avec adresse masquée.
- Jeton expiré: message `Ce lien de vérification a expiré.`
- Jeton déjà utilisé: message `Ce lien de vérification a déjà été utilisé.`
- Jeton invalide: message `Ce lien de vérification est invalide.`

## Test local

1. Configurer les variables SMTP dans `.env.local`.
2. Définir `NEXT_PUBLIC_APP_URL=http://localhost:3000`.
3. Lancer l'application avec `npm run dev`.
4. Depuis `/compte`, envoyer le lien de vérification.
5. Ouvrir le lien reçu: l'adresse reste non vérifiée tant que le bouton de
   confirmation n'a pas été utilisé.
6. Confirmer puis revenir dans `/compte`: le statut doit être `Vérifié`.
