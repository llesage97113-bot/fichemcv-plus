# FicheMCV+ — Architecture technique

## 1. Objet du document

Ce document décrit l’architecture technique actuelle du projet FicheMCV+.

Il vise à documenter les choix techniques, les principaux composants applicatifs, les services utilisés, les tables structurantes et les flux essentiels entre l’interface, l’authentification et la base de données.

## 2. Vue d’ensemble

FicheMCV+ repose sur une architecture web moderne articulée autour de quatre piliers :

- une application Next.js ;
- une base de données Supabase PostgreSQL ;
- Supabase Auth pour l’authentification ;
- GitHub / Vercel pour le versionnement et le déploiement.

Schéma général :

```txt
Utilisateur
   ↓
Navigateur / PWA
   ↓
Application Next.js
   ↓
Routes API Next.js
   ↓
Supabase Auth + Supabase Database
