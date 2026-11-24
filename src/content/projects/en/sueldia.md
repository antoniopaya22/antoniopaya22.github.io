---
title: SueldIA
tagline: A web app that reads your Spanish payslip PDFs, extracts every line item and turns them into a salary and personal-finance dashboard
description: "SueldIA: a payslip web app with OCR that extracts every line item from the PDF, tracks gross, net and income tax, and links pay to your personal finances."
kind: product
year: 2026
status: Live · free
repo: https://github.com/antoniopaya22/SueldIA
site: https://sueldia.vercel.app/
stack: [TypeScript, Astro, React, Tailwind CSS, Express, Drizzle ORM, PostgreSQL, Supabase, Vercel]
facts:
  - { value: "€0", label: "free plan, no card, no payslip limit" }
  - { value: "2", label: "payslip types: private company and public sector" }
  - { value: "0", label: "PDFs stored: processed in memory, then discarded" }
  - { value: "YNAB", label: "history import from CSV" }
links:
  - { label: "Open the app", href: "https://sueldia.vercel.app/" }
  - { label: "Features (Spanish)", href: "https://sueldia.vercel.app/caracteristicas" }
  - { label: "Pricing (Spanish)", href: "https://sueldia.vercel.app/precios" }
  - { label: "Source code", href: "https://github.com/antoniopaya22/SueldIA" }
order: 8
---

## The problem

A Spanish payslip is a PDF packed with earnings, deductions, tax withholding and bonus months. Working out how much your net pay grew over a year, what your average income tax rate is, or whether a month is missing usually means a hand-maintained spreadsheet. SueldIA starts from the PDF and does that work for you.

## How it works

When you upload one or more payslips, the parser rebuilds the PDF text row by row and column by column, detects the format, and extracts the period, employer, gross and net pay, and every individual line item. It handles both private-company payslips and public-sector ones with their bordered tables. Scanned PDFs are read with OCR inside your own browser, so the document never leaves your device.

The PDF itself is never stored: it is processed in memory and only the extracted text and structured line items are kept. When the extraction engine improves, saved payslips can be reprocessed without uploading them again.

Architecturally it is a static Astro frontend with React islands talking to an Express backend (Drizzle ORM and Zod) on Supabase Postgres, with row-level security on every table. Sign-in is Google through Supabase Auth, and everything ships as a single Vercel project with two services plus a daily cron for recurring transactions and alerts.

## What's inside

- A dashboard with monthly and yearly gross and net pay, average income tax withholding, year-over-year comparison and an annual projection including bonus months.
- Alerts when net pay drops below the usual level, a month is missing or a line item changes sharply.
- Several profiles per account, each with its own history.
- Personal finance: accounts, transactions, custom categories and import from YNAB.
- Manual editing of line items when extraction misses something.

## Try it

The quickest route is to sign in at [sueldia.vercel.app](https://sueldia.vercel.app/) with a Google account and upload a payslip; the interface is in Spanish. To run it locally you need Node 22 or later, a Postgres database and a Supabase project with the Google provider set up:

```bash
npm install
cp .env.example .env.local   # DATABASE_URL, SUPABASE_URL...
set -a; source .env.local; set +a
npm run db:migrate && npm run dev
```
