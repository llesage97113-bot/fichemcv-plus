# Recuperation autonome du mot de passe

## Parcours manuel

1. Ouvrir `/login`.
2. Cliquer sur `Mot de passe perdu ?`.
3. Saisir l'identifiant de connexion habituel.
4. Recevoir le mail de reinitialisation, soit via Supabase Auth, soit via
   l'adresse de recuperation verifiee.
5. Cliquer sur le lien.
6. Arriver sur `/reset-password`.
7. Saisir et confirmer le nouveau mot de passe.
8. Etre redirige vers `/login`.
9. Se reconnecter avec le nouveau mot de passe.

Tester aussi une adresse inconnue, une adresse `@fichemcv.local`, un lien expire
et un lien deja utilise. Le message de demande doit rester neutre dans tous les
cas ou le format email est valide.

## Parcours hybride Patch 7

La page `/forgot-password` n'appelle plus directement Supabase depuis le
navigateur. Elle poste l'identifiant a `/api/auth/request-password-reset`.

La route serveur applique cette logique :

- identifiant a adresse reelle : conserver le parcours natif
  `supabase.auth.resetPasswordForEmail`, avec redirection directe vers
  `/reset-password` ;
- identifiant interne, par exemple `prenom.nom@fichemcv.local` : rechercher le
  compte applicatif, exiger une ligne `user_contacts` de type `email` avec
  `verified_at` renseigne, creer un jeton applicatif a usage unique, puis
  envoyer le lien a l'adresse de recuperation ;
- compte inexistant, compte sans contact, contact non verifie, cooldown actif
  ou quota horaire atteint : ne rien reveler et retourner le meme message
  public.

Message public unique :

```txt
Si un compte correspondant existe et dispose d’une adresse de récupération vérifiée, un courriel a été envoyé.
```

## Backfill Patch 8

Le Patch 8 ajoute `can_be_used_for_recovery` puis marque les contacts email
historiques comme autorises pour la recuperation. Cette decision repose sur
l'analyse du modele actuel : avant Patch 8, les contacts email applicatifs
etaient crees par le formulaire de recuperation d'adresse dedie, via le helper
serveur Patch 6, et il n'existait pas d'autre writer applicatif pour
`user_contacts` de type email.

Si ce modele evolue et qu'un autre parcours commence a creer des emails de
simple contact sans consentement a la recuperation, il faudra retirer ce
backfill ou le restreindre davantage.

Le lien applicatif a la forme :

```txt
${NEXT_PUBLIC_APP_URL}/reset-password?token=...
```

Il ne contient ni identifiant interne, ni UUID utilisateur, ni adresse de
recuperation.

## Configuration Supabase Auth

Ne pas modifier automatiquement la configuration distante depuis le code.

En developpement local, configurer :

- Site URL : `http://localhost:3000`
- Redirect URLs :
  - `http://localhost:3000/reset-password`

La page `/forgot-password` appelle :

```ts
fetch("/api/auth/request-password-reset", {
  method: "POST",
  body: JSON.stringify({ identifier }),
});
```

La route serveur appelle ensuite `resetPasswordForEmail` uniquement pour les
adresses Auth reelles. L'URL de production devra etre ajoutee avec le meme
chemin quand elle sera connue. Les templates d'email Supabase pourront etre
adaptes plus tard pour clarifier le texte du bouton et la duree de validite du
lien.

## Variables d'environnement

Variables deja requises pour ce parcours :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`

`SUPABASE_SERVICE_ROLE_KEY` reste strictement cote serveur. Ne pas l'exposer
dans un composant client.

## Migration Patch 7

Appliquer manuellement dans le SQL Editor du projet Supabase distant :

```txt
supabase/migrations/20260626170000_add_user_password_reset_tokens.sql
```

Cette migration cree `public.user_password_reset_tokens`, active la RLS sans
policy client, puis ajoute deux fonctions reservees au `service_role` :

- `consume_user_password_reset_token`
- `invalidate_expired_user_password_reset_tokens`

Ne pas modifier les migrations precedentes, ne pas lancer `supabase db reset`,
et ne pas tenter de lancer Supabase localement sans Docker Desktop.

## Session de recuperation navigateur

Supabase redirige directement le navigateur vers `/reset-password` avec un
fragment d'URL. Ce fragment n'est pas transmis au serveur. Le composant client
ecoute `supabase.auth.onAuthStateChange` et n'affiche le formulaire qu'apres
l'evenement `PASSWORD_RECOVERY`, ou si une session de recuperation issue du
fragment vient deja d'etre initialisee. Les liens expires affichent un message
generique et proposent de demander un nouveau lien. Le fragment est nettoye avec
`history.replaceState` apres traitement.

## Jeton applicatif Patch 7

Pour les comptes internes, `/reset-password?token=...` est lu par la page
serveur uniquement pour classifier le lien. Le mot de passe n'est jamais modifie
sur un simple GET.

La modification effective passe par `/api/auth/confirm-password-reset` :

1. validation stricte du token et du mot de passe ;
2. hash SHA-256 du token recu ;
3. consommation atomique et definitive du jeton via RPC, avec verrouillage
   `FOR UPDATE` et invalidation des autres jetons actifs du meme utilisateur ;
4. modification du mot de passe via Supabase Admin.

Si la modification du mot de passe echoue apres consommation du jeton, le jeton
reste consomme. L'utilisateur doit demander un nouveau lien.

## Limite temporelle de la demande

La route `/api/auth/request-password-reset` retourne toujours le meme message
public et applique un delai minimal avec une petite variation aleatoire aux
reponses rapides. Ce mecanisme reduit les ecarts les plus evidents, mais ne
supprime pas completement l'enumeration temporelle : l'envoi SMTP synchrone peut
encore rendre un compte valide plus lent qu'un compte absent. Une file d'envoi
asynchrone serait la solution de production pour uniformiser davantage le temps
de reponse.

## Test manuel Patch 7

1. Appliquer la migration SQL Patch 7 dans Supabase.
2. Verifier que `NEXT_PUBLIC_APP_URL` pointe vers l'application testee.
3. Verifier que les variables SMTP sont configurees.
4. Se connecter avec un compte interne.
5. Dans `/compte`, ajouter une adresse de recuperation reelle et verifier cette
   adresse via le mail Patch 6.
6. Se deconnecter.
7. Ouvrir `/forgot-password`.
8. Saisir l'identifiant interne habituel, par exemple
   `prenom.nom@fichemcv.local`.
9. Verifier que le message public reste generique.
10. Ouvrir le mail recu sur l'adresse de recuperation.
11. Cliquer le lien `/reset-password?token=...`.
12. Tester une confirmation differente : le formulaire doit refuser.
13. Tester un mot de passe trop court : le formulaire doit refuser.
14. Saisir un nouveau mot de passe valide deux fois : le formulaire doit
    confirmer le succes puis rediriger vers `/login`.
15. Se connecter avec l'identifiant interne et le nouveau mot de passe.
16. Reouvrir le meme lien : il doit etre refuse comme deja consomme.
17. Depuis `/forgot-password`, tester un identifiant inexistant, un compte sans
    adresse de recuperation et un compte avec adresse non verifiee : le message
    public doit rester identique.
