/** Language-independent data shared by both locales. */

export const site = {
  url: 'https://antoniopaya22.github.io',
  name: 'Antonio Payá González',
  email: 'antoniopaya@outlook.com',
  cv: 'cv-antonio-paya.pdf',
};

/** PDF CV per language (rendered from /cv and /en/cv). */
export const cvPdf = (lang: 'es' | 'en') => (lang === 'es' ? site.cv : site.cv.replace('.pdf', '-en.pdf'));

export const profiles = [
  { label: 'GitHub', handle: 'antoniopaya22', href: 'https://github.com/antoniopaya22' },
  { label: 'LinkedIn', handle: 'in/antoniopaya22', href: 'https://www.linkedin.com/in/antoniopaya22/' },
  { label: 'Google Scholar', handle: '4bCBOysAAAAJ', href: 'https://scholar.google.com/citations?user=4bCBOysAAAAJ' },
  { label: 'ORCID', handle: '0000-0003-3733-3805', href: 'https://orcid.org/0000-0003-3733-3805' },
  { label: 'ResearchGate', handle: 'Antonio-Paya-3', href: 'https://www.researchgate.net/profile/Antonio-Paya-3' },
  { label: 'Medium', handle: '@antonioalfa22', href: 'https://medium.com/@antonioalfa22' },
];

/** Verified against ORCID and Crossref. Citation counts are refreshed from Crossref at build time. */
export const publications = [
  {
    title: 'Enhancing Software-Defined Perimeters with Integrated Identity Solutions and Threat Detection for Robust Zero Trust Security',
    journal: 'International Journal of Information Security',
    publisher: 'Springer',
    year: 2025,
    doi: '10.1007/s10207-025-01099-9',
    type: 'article',
    citations: 9,
    tags: ['SDP', 'Zero Trust', 'Identity'],
  },
  {
    title: 'SecureSDP: A Novel Software-Defined Perimeter Implementation for Enhanced Network Security and Scalability',
    journal: 'International Journal of Information Security',
    publisher: 'Springer',
    year: 2024,
    doi: '10.1007/s10207-024-00863-7',
    type: 'article',
    citations: 9,
    tags: ['SDP', 'Network Security'],
  },
  {
    title: 'Apollon: A Robust Defense System against Adversarial Machine Learning Attacks in Intrusion Detection Systems',
    journal: 'Computers & Security',
    publisher: 'Elsevier',
    year: 2024,
    doi: '10.1016/j.cose.2023.103546',
    type: 'article',
    citations: 103,
    tags: ['Adversarial ML', 'IDS'],
  },
  {
    title: 'Securing the Software-Defined Perimeter Framework with Automated Security Configuration Deployment Systems',
    journal: 'SSRN Electronic Journal',
    publisher: 'Preprint',
    year: 2023,
    doi: '10.2139/ssrn.4326496',
    type: 'preprint',
    citations: 1,
    tags: ['SDP', 'Automation'],
  },
  {
    title: 'Egida: Automated Security Configuration Deployment Systems with Early Error Detection',
    journal: 'Computers & Security',
    publisher: 'Elsevier',
    year: 2022,
    doi: '10.1016/j.cose.2022.102638',
    type: 'article',
    citations: 4,
    tags: ['Hardening', 'Automation'],
  },
].map((p) => ({ ...p, url: `https://doi.org/${p.doi}` }));

/** Featured repositories; live stats are fetched at build time (see github.ts). */
export const featuredRepos = [
  { repo: 'antoniopaya22/go-rest-template', key: 'go-rest-template', tags: ['Go', 'Gin', 'REST'], fallback: { stars: 172, forks: 36, language: 'Go' } },
  { repo: 'antoniopaya22/apollon', key: 'apollon', paper: 'https://doi.org/10.1016/j.cose.2023.103546', tags: ['Adversarial ML', 'IDS'], fallback: { stars: 4, forks: 1, language: 'Jupyter Notebook' } },
  { repo: 'antoniopaya22/Software-Defined-Perimeter', key: 'Software-Defined-Perimeter', paper: 'https://doi.org/10.2139/ssrn.4326496', tags: ['SDP', 'Zero Trust', 'SPA'], fallback: { stars: 21, forks: 3, language: 'Go' } },
  { repo: 'Egida-Kassandra/egida', key: 'egida', paper: 'https://doi.org/10.1016/j.cose.2022.102638', tags: ['Hardening', 'DSL'], fallback: { stars: 10, forks: 1, language: 'Java' } },
  { repo: 'antoniopaya22/SimpleSDP', key: 'SimpleSDP', tags: ['SDP', 'Zero Trust'], fallback: { stars: 2, forks: 0, language: 'Python' } },
  { repo: 'antoniopaya22/project-agent-harness', key: 'project-agent-harness', tags: ['AI agents', 'Claude Code'], fallback: { stars: 2, forks: 0, language: 'JavaScript' } },
] as const;
