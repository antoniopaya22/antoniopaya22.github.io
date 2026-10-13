import type { Lang } from './translations';

/** CV-specific copy. Shared facts (jobs, degrees, publications…) come from translations.ts and data/. */
export const cvCopy = {
  es: {
    title: 'CV — Antonio Payá González',
    role: 'Arquitecto de Software · Profesor en UNIR · PhD',
    summary:
      'Arquitecto de Software y Doctor en Informática con más de 8 años de experiencia diseñando arquitecturas cloud seguras y escalables, llevando modelos de IA a producción y automatizando infraestructura. Investigador en Software-Defined Perimeters, Zero Trust y defensa frente a Adversarial Machine Learning, con 4 artículos JCR como primer autor. Desde 2026, profesor en el Grado y Máster en Ciberseguridad de UNIR.',
    labels: {
      profile: 'Perfil',
      experience: 'Experiencia',
      research: 'Investigación',
      thesis: 'Tesis doctoral',
      publications: 'Publicaciones',
      education: 'Formación',
      expertise: 'Especialización',
      skills: 'Competencias técnicas',
      projects: 'Open source',
      awards: 'Premios',
      courses: 'Cursos y certificaciones',
      languages: 'Idiomas',
      contact: 'Contacto',
      present: 'Actualidad',
      citations: 'citas',
      citation: 'cita',
      honors: 'Matrículas de Honor',
      print: 'Descargar PDF',
      back: 'Volver a la web',
      updated: 'Actualizado',
    },
    thesisTitle: 'Diseño de estrategias de refuerzo para sistemas basados en Perímetros Definidos por Software mediante estrategias de seguridad inteligentes',
    thesisNote: 'Universidad de Oviedo · 2021 — 2025',
    extraPoints: {
      'TheNextPangea S.L.': ['Liderazgo técnico y estratégico en el ciclo de vida de los productos digitales.'],
      'Icube SL': ['Diseño, gestión y despliegue de entornos DevOps; desarrollo full stack.'],
    } as Record<string, string[]>,
    extraCourses: [
      { title: 'AWS Cloud Practitioner', issuer: 'AWS' },
      { title: 'Software Defined Networking', issuer: 'The University of Chicago' },
    ],
    languages: [
      { name: 'Español', level: 'Nativo', pct: 100 },
      { name: 'Inglés', level: 'Profesional', pct: 80 },
    ],
  },
  en: {
    title: 'CV — Antonio Payá González',
    role: 'Software Architect · Professor at UNIR · PhD',
    summary:
      'Software Architect and PhD in Computer Science with over 8 years of experience designing secure, scalable cloud architectures, bringing AI models into production and automating infrastructure. Researcher in Software-Defined Perimeters, Zero Trust and defences against Adversarial Machine Learning, with 4 JCR articles as first author. Since 2026, Professor in the Cybersecurity Bachelor\'s and Master\'s degrees at UNIR.',
    labels: {
      profile: 'Profile',
      experience: 'Experience',
      research: 'Research',
      thesis: 'Doctoral thesis',
      publications: 'Publications',
      education: 'Education',
      expertise: 'Expertise',
      skills: 'Technical skills',
      projects: 'Open source',
      awards: 'Awards',
      courses: 'Courses & certifications',
      languages: 'Languages',
      contact: 'Contact',
      present: 'Present',
      citations: 'citations',
      citation: 'citation',
      honors: 'Distinctions',
      print: 'Download PDF',
      back: 'Back to website',
      updated: 'Updated',
    },
    thesisTitle: 'Diseño de estrategias de refuerzo para sistemas basados en Perímetros Definidos por Software mediante estrategias de seguridad inteligentes',
    thesisNote: 'University of Oviedo · 2021 — 2025 · original title (Spanish)',
    extraPoints: {
      'TheNextPangea S.L.': ['Technical and strategic leadership across the digital product lifecycle.'],
      'Icube SL': ['Design, management and deployment of DevOps environments; full stack development.'],
    } as Record<string, string[]>,
    extraCourses: [
      { title: 'AWS Cloud Practitioner', issuer: 'AWS' },
      { title: 'Software Defined Networking', issuer: 'The University of Chicago' },
    ],
    languages: [
      { name: 'Spanish', level: 'Native', pct: 100 },
      { name: 'English', level: 'Professional', pct: 80 },
    ],
  },
} as const;

export function cv(lang: Lang) {
  return cvCopy[lang];
}
