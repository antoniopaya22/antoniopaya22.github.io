---
title: SueldIA
tagline: Aplicación web que lee el PDF de tus nóminas españolas, extrae cada concepto y lo convierte en un panel de evolución salarial y finanzas personales
description: "SueldIA: app web de nóminas con OCR que extrae cada concepto del PDF, analiza bruto, neto e IRPF y conecta tu sueldo con tus finanzas personales."
kind: product
year: 2026
status: En producción · gratis
repo: https://github.com/antoniopaya22/SueldIA
site: https://sueldia.vercel.app/
stack: [TypeScript, Astro, React, Tailwind CSS, Express, Drizzle ORM, PostgreSQL, Supabase, Vercel]
facts:
  - { value: "0 €", label: "plan gratuito, sin tarjeta ni límite de nóminas" }
  - { value: "2", label: "tipos de nómina: empresa privada y organismo público" }
  - { value: "0", label: "PDFs almacenados: se procesan en memoria y se descartan" }
  - { value: "YNAB", label: "importación del histórico desde CSV" }
links:
  - { label: "Abrir la app", href: "https://sueldia.vercel.app/" }
  - { label: "Características", href: "https://sueldia.vercel.app/caracteristicas" }
  - { label: "Precios", href: "https://sueldia.vercel.app/precios" }
  - { label: "Código fuente", href: "https://github.com/antoniopaya22/SueldIA" }
order: 8
---

## El problema

Una nómina española es un PDF lleno de devengos, deducciones, retenciones y pagas extra. Saber cuánto ha subido el neto en un año, cuál es la retención media de IRPF o si falta una nómina suele acabar en una hoja de cálculo rellenada a mano. SueldIA parte del PDF y hace ese trabajo de forma automática.

## Cómo funciona

Al subir una o varias nóminas, el analizador reconstruye el texto del PDF por filas y columnas, detecta el formato y extrae el periodo, la empresa, el bruto, el neto y cada concepto por separado. Reconoce tanto nóminas de empresa privada como de organismos públicos, con sus tablas con bordes. Los PDF escaneados se leen con OCR en el propio navegador, sin que el documento salga del dispositivo.

El PDF no se guarda: se procesa en memoria y solo se conservan el texto extraído y los conceptos estructurados. Si el motor de extracción mejora, las nóminas ya guardadas se pueden reprocesar sin volver a subirlas.

La arquitectura es un frontend estático en Astro con islas de React que habla con un backend Express (Drizzle ORM y Zod) sobre PostgreSQL en Supabase, con RLS activado en todas las tablas. El acceso es con Google mediante Supabase Auth, y todo se despliega como un único proyecto de Vercel con dos servicios y un cron diario para movimientos recurrentes y alertas.

## Qué incluye

- Panel con la evolución mensual y anual de bruto y neto, retención media de IRPF, comparativa interanual y proyección con pagas extra.
- Alertas cuando el neto baja de lo esperado, falta un mes o un concepto cambia de golpe.
- Varios perfiles por cuenta, cada uno con su propio historial.
- Finanzas personales: cuentas, movimientos, categorías personalizables e importación desde YNAB.
- Edición manual de conceptos cuando la extracción no reconoce alguno.

## Pruébalo

La forma más directa es entrar en [sueldia.vercel.app](https://sueldia.vercel.app/) con una cuenta de Google y subir una nómina. Para ejecutarla en local hacen falta Node 22 o superior, un Postgres y un proyecto de Supabase con el proveedor de Google configurado:

```bash
npm install
cp .env.example .env.local   # DATABASE_URL, SUPABASE_URL...
set -a; source .env.local; set +a
npm run db:migrate && npm run dev
```
