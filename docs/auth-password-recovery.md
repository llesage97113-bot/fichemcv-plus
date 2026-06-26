# Recuperation autonome du mot de passe

## Parcours manuel

1. Ouvrir `/login`.
2. Cliquer sur `Mot de passe perdu ?`.
3. Saisir une adresse email reelle.
4. Recevoir le mail de reinitialisation Supabase.
5. Cliquer sur le lien.
6. Arriver sur `/reset-password`.
7. Saisir et confirmer le nouveau mot de passe.
8. Etre redirige vers `/login`.
9. Se reconnecter avec le nouveau mot de passe.

Tester aussi une adresse inconnue, une adresse `@fichemcv.local`, un lien expire
et un lien deja utilise. Le message de demande doit rester neutre dans tous les
cas ou le format email est valide.

## Configuration Supabase Auth

Ne pas modifier automatiquement la configuration distante depuis le code.

En developpement local, configurer :

- Site URL : `http://localhost:3000`
- Redirect URLs :
  - `http://localhost:3000/reset-password`

La page `/forgot-password` appelle :

```ts
supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${origin}/reset-password`,
})
```

L'URL de production devra etre ajoutee avec le meme chemin quand elle sera
connue. Les templates d'email Supabase pourront etre adaptes plus tard pour
clarifier le texte du bouton et la duree de validite du lien.

## Session de recuperation navigateur

Supabase redirige directement le navigateur vers `/reset-password` avec un
fragment d'URL. Ce fragment n'est pas transmis au serveur. Le composant client
ecoute `supabase.auth.onAuthStateChange` et n'affiche le formulaire qu'apres
l'evenement `PASSWORD_RECOVERY`, ou si une session de recuperation issue du
fragment vient deja d'etre initialisee. Les liens expires affichent un message
generique et proposent de demander un nouveau lien. Le fragment est nettoye avec
`history.replaceState` apres traitement.
