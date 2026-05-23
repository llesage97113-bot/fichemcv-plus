#!/bin/bash

set -e

COMMIT_MESSAGE="$1"

echo "======================================"
echo "🤖 Chatty Commit — FicheMCV+"
echo "======================================"
echo ""

if [ -z "$COMMIT_MESSAGE" ]; then
  echo "❌ Erreur : tu dois fournir un message de commit."
  echo ""
  echo "Exemple :"
  echo "./scripts/chatty_commit.sh \"Add student dashboard summary cards\""
  exit 1
fi

if [ ! -f "package.json" ]; then
  echo "❌ Erreur : package.json introuvable."
  echo "Place-toi dans le dossier du projet :"
  echo "cd ~/FicheMCVPlus/fichemcv-plus"
  exit 1
fi

echo "📍 Dossier courant :"
pwd
echo ""

echo "🔎 État Git avant build :"
git status
echo ""

echo "🏗️ Build Next.js en cours..."
npm run build

echo ""
echo "✅ Build réussi."
echo ""

echo "🔎 État Git après build :"
git status
echo ""

if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo "ℹ️ Aucun changement à committer."
  echo ""
  git status
  exit 0
fi

echo "➕ Ajout des fichiers modifiés..."
git add -A

echo ""
echo "📝 Commit en cours : $COMMIT_MESSAGE"
git commit -m "$COMMIT_MESSAGE"

echo ""
echo "✅ Commit effectué."
echo ""

echo "🔎 État Git final :"
git status

echo ""
echo "🎉 Terminé, Padawan du Terminal."
