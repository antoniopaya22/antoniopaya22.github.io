export type Lang = 'es' | 'en';

export const translations = {
  es: {
    // Layout
    layout: {
      title: 'Antonio Payá González — Arquitecto de Software & Investigador PhD',
      description: 'Antonio Payá González — Software Architect & PhD',
    },

    // Header
    header: {
      links: [
        { href: '#sobre-mi', label: 'Sobre mí' },
        { href: '#experiencia', label: 'Experiencia' },
        { href: '#educacion', label: 'Educación' },
        { href: '#skills', label: 'Skills' },
        { href: '#publicaciones', label: 'Publicaciones' },
        { href: '#premios', label: 'Premios' },
        { href: '#contacto', label: 'Contacto' },
      ],
    },

    // Hero
    hero: {
      badge: 'Disponible para colaboraciones',
      role: 'Software Architect · PhD en Ingeniería Informática',
      intro: 'Arquitecto de Software en <strong>TheNextPangea</strong> y Doctor por la <strong>Universidad de Oviedo</strong>. Investigador en ciberseguridad, sistemas inteligentes y tecnologías blockchain.',
      ctaPrimary: 'Contactar',
      ctaSecondary: 'Publicaciones',
      scroll: 'Scroll',
    },

    // About
    about: {
      eyebrow: 'Sobre mí',
      heading: 'Un poco sobre mi',
      headingAccent: 'historia',
      body: [
        'Mi nombre es <strong>Antonio Payá González</strong>. Soy Arquitecto de Software en <strong>TheNextPangea S.L.</strong> y Doctor en Ingeniería Informática por la <strong>Universidad de Oviedo</strong>, con línea de investigación en Sistemas Inteligentes.',
        'Mi trabajo de investigación se centra en mejorar los <em>Software-Defined Perimeters</em> (SDP) integrando sistemas de detección de intrusiones y optimizando la gestión de identidades. Desarrollo configuraciones de seguridad automatizadas y mejoro la resiliencia de IDS frente a ataques de <em>Adversarial Machine Learning</em>.',
        'También soy escritor y editor de <a href="https://medium.com/better-programming" target="_blank" rel="noopener" class="animated-link">Better Programming</a> y <a href="https://medium.com/coinmonks" target="_blank" rel="noopener" class="animated-link">Coinmonks</a> en Medium.',
      ],
      skills: ['Desarrollo Web', 'Machine Learning', 'Blockchain', 'Ciberseguridad', 'Software Architecture', 'IoT'],
      stats: [
        { value: '7', label: 'Publicaciones' },
        { value: '128+', label: 'Citas' },
        { value: '8', label: 'Matrículas Honor' },
        { value: '3', label: 'Hackathons ganados' },
      ],
    },

    // Experience
    experience: {
      eyebrow: 'Experiencia',
      heading: 'Trayectoria',
      headingAccent: 'profesional',
      desc: 'Más de 6 años de experiencia en desarrollo de software, investigación y arquitectura.',
      jobs: [
        {
          role: 'Arquitecto de Software',
          company: 'TheNextPangea S.L.',
          type: 'Jornada completa',
          period: 'Sept 2021 — Actualidad',
          desc: 'Diseño de arquitecturas de software escalables y mantenibles. The factory of intangible assets.',
          tags: ['Architecture', 'Full Stack', 'Cloud'],
          current: true,
          logo: 'logo-tnp.png',
          logoDark: false,
        },
        {
          role: 'Ingeniero I+D de Software',
          company: 'Icube SL',
          type: 'Jornada completa',
          period: 'Oct 2019 — Sept 2021',
          desc: 'Técnico en investigación y desarrollo en técnicas de additive manufacturing. Colaboración con ArcelorMittal R&D.',
          tags: ['R&D', 'Additive Manufacturing'],
          current: false,
          logo: 'logo-icube.webp',
          logoDark: true,
        },
        {
          role: 'Investigador en Blockchain',
          company: 'Fundación Universidad de Oviedo',
          type: 'Beca',
          period: 'Abr 2018 — Ago 2019',
          desc: 'Investigación en tecnologías Blockchain y su impacto en el mercado, centradas en Hyperledger Fabric.',
          tags: ['Blockchain', 'Hyperledger', 'Research'],
          current: false,
          logo: 'logo-uniovi.jpg',
          logoDark: false,
        },
        {
          role: 'Junior Software Developer',
          company: 'ArcelorMittal',
          type: 'Prácticas',
          period: 'Ene 2019 — Mar 2019',
          desc: 'Despliegue de Blockchain en entorno industrial real. Smart contracts y tecnologías DLT.',
          tags: ['DLT', 'Smart Contracts', 'Hyperledger Fabric'],
          current: false,
          logo: 'logo-arcelormittal.png',
          logoDark: true,
        },
      ],
    },

    // Education
    education: {
      eyebrow: 'Educación',
      heading: 'Formación',
      headingAccent: 'académica',
      desc: 'Desde el grado hasta el doctorado, con 8 matrículas de honor en el camino.',
      honorsLabel: '🏅 Matrículas de Honor',
      certsHeading: 'Certificaciones',
      degrees: [
        {
          title: 'Doctorado (PhD) en Ingeniería Informática',
          school: 'Universidad de Oviedo',
          period: '2021 — 2025',
          desc: 'Tesis centrada en Software-Defined Perimeter, Intrusion Detection Systems y Adversarial Machine Learning.',
          honors: [] as string[],
          current: true,
          logo: 'logo-uniovi.jpg',
        },
        {
          title: 'Máster en Ingeniería Web',
          school: 'Universidad de Oviedo',
          period: '2019 — 2021',
          desc: 'Especialización en desarrollo web avanzado y arquitecturas modernas.',
          honors: ['Trabajo Fin de Máster — Matrícula de Honor'],
          current: false,
          logo: 'logo-uniovi.jpg',
        },
        {
          title: 'Grado en Ingeniería del Software',
          school: 'Universidad de Oviedo',
          period: '2015 — 2019',
          desc: 'Formación sólida en ingeniería del software, algoritmos, bases de datos y sistemas distribuidos.',
          honors: [
            'Administración de SO y Redes',
            'Computabilidad',
            'Proyecto Fin de Grado — 10 sobre 10',
            'Prácticas en Empresa',
            'Sistemas Distribuidos e Internet',
            'Sistemas Operativos',
            'Software para Robots',
            'Tecnología y Paradigmas de la Programación',
          ],
          current: false,
          logo: 'logo-uniovi.jpg',
        },
      ],
      certs: [
        { title: 'Machine Learning', issuer: 'Stanford · Coursera', year: 2020 },
        { title: 'Python & Django Full Stack Web Developer', issuer: 'Udemy', year: 2017 },
        { title: 'Angular: De 0 a experto', issuer: 'Udemy', year: 2017 },
        { title: 'Automatización con Selenium', issuer: 'COIIPA', year: 2016 },
      ],
    },

    // Skills
    skills: {
      eyebrow: 'Skills',
      heading: 'Competencias',
      headingAccent: 'técnicas',
      desc: 'Cloud, arquitectura, desarrollo full stack y ciberseguridad.',
      groups: [
        { label: 'Cloud & DevOps', icon: '☁️', techs: ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'CI/CD', 'MLOps'] },
        { label: 'Arquitectura de Software', icon: '🏗️', techs: ['Microservices', 'DDD', 'Event-Driven', 'REST', 'GraphQL', 'gRPC'] },
        { label: 'Frontend', icon: '🖥️', techs: ['Astro', 'Angular', 'React', 'TypeScript', 'Tailwind', 'Vue'] },
        { label: 'Backend', icon: '⚡', techs: ['.NET Core', 'Python', 'Go', 'Rust', 'Node.js', 'Spring'] },
        { label: 'Aplicaciones de Escritorio', icon: '💻', techs: ['Tauri', 'Electron'] },
        { label: 'Machine Learning / IA', icon: '🤖', techs: ['Scikit-learn', 'TensorFlow', 'PyTorch', 'Adversarial ML', 'MLOps'] },
        { label: 'Blockchain', icon: '🔗', techs: ['Hyperledger Fabric', 'Solidity', 'Smart Contracts', 'DLT'] },
        { label: 'Ciberseguridad', icon: '🔒', techs: ['SDP', 'Zero Trust', 'IDS / IPS', 'Pentesting'] },
      ],
      toolsHeading: 'Herramientas & Plataformas',
      tools: ['Git', 'PostgreSQL', 'MongoDB', 'Redis', 'Linux', 'Nginx', 'RabbitMQ', 'Kafka', 'Figma'],
    },

    // Publications
    publications: {
      eyebrow: 'Publicaciones',
      heading: 'Artículos en revistas',
      headingAccent: 'JCR',
      desc: 'Investigación publicada en revistas internacionales de alto impacto (Q1 & Q2).',
      stats: [
        { value: '7', label: 'Publicaciones', icon: '📄' },
        { value: '128+', label: 'Citas', icon: '📊' },
        { value: '1.1K+', label: 'Lecturas', icon: '👁️' },
      ],
    },

    // Awards
    awards: {
      eyebrow: 'Premios',
      headingAccent: 'Reconocimientos',
      desc: 'Hackathons, competiciones de ciberseguridad y festivales internacionales de cine.',
      items: [
        { title: 'Finalista INNCYBER', org: 'INCIBE', year: 'Oct 2020', desc: 'Finalista en la competición nacional de ciberseguridad e innovación.', icon: '🏆', color: 'var(--violet)' },
        { title: 'Ganador HP Hackathon', org: 'HP Inc.', year: 'Nov 2019', desc: 'Primer premio en el hackathon organizado por HP España.', icon: '🥇', color: 'var(--accent)' },
        { title: 'Ganador Salesforce Hackathon', org: 'Salesforce', year: 'Abr 2019', desc: 'Primer premio desarrollando soluciones innovadoras con tecnologías cloud.', icon: '🥇', color: 'var(--cyan)' },
        { title: '2º Puesto Capgemini', org: 'Capgemini', year: '2018', desc: 'Segunda posición en el desafío tecnológico Capgemini España.', icon: '🥈', color: 'var(--emerald)' },
        { title: 'Jurado Ajyal Film Festival', org: 'Doha Film Institute', year: 'Dic 2014', desc: 'Seleccionado como miembro del jurado joven en el festival de Doha, Qatar.', icon: '🎬', color: 'var(--rose)' },
        { title: 'Jurado Giffoni Film Festival', org: 'Giffoni Experience', year: 'Jul 2014', desc: 'Miembro del jurado juvenil en el festival de cine de Giffoni, Italia.', icon: '🎬', color: 'var(--rose)' },
      ],
    },

    // Contact
    contact: {
      eyebrow: 'Contacto',
      heading: '¿',
      headingAccent: 'Hablamos',
      headingSuffix: '?',
      text: 'Siempre abierto a nuevas oportunidades de investigación, colaboraciones técnicas o simplemente una buena conversación sobre tecnología.',
      terminalFile: 'contact.sh',
      terminalLines: [
        { prompt: '$', cmd: 'echo', arg: '"¡Hablemos!"' },
        { prompt: '$', cmd: 'mail', arg: '-s "Colaboración" antoniopaya@outlook.com' },
      ],
      cta: 'Enviar email',
    },

    // Footer
    footer: {
      copy: 'Software Architect · PhD Researcher',
      links: [
        { href: '#sobre-mi', label: 'Sobre mí' },
        { href: '#experiencia', label: 'Experiencia' },
        { href: '#publicaciones', label: 'Publicaciones' },
        { href: '#contacto', label: 'Contacto' },
      ],
      designed: 'Diseñado con',
      using: 'usando',
    },
  },

  en: {
    // Layout
    layout: {
      title: 'Antonio Payá González — Software Architect & PhD Researcher',
      description: 'Antonio Payá González — Software Architect & PhD',
    },

    // Header
    header: {
      links: [
        { href: '#about', label: 'About' },
        { href: '#experience', label: 'Experience' },
        { href: '#education', label: 'Education' },
        { href: '#skills', label: 'Skills' },
        { href: '#publications', label: 'Publications' },
        { href: '#awards', label: 'Awards' },
        { href: '#contact', label: 'Contact' },
      ],
    },

    // Hero
    hero: {
      badge: 'Open to collaborations',
      role: 'Software Architect · PhD in Computer Engineering',
      intro: 'Software Architect at <strong>TheNextPangea</strong> and PhD from the <strong>University of Oviedo</strong>. Researcher in cybersecurity, intelligent systems, and blockchain technologies.',
      ctaPrimary: 'Get in Touch',
      ctaSecondary: 'Publications',
      scroll: 'Scroll',
    },

    // About
    about: {
      eyebrow: 'About me',
      heading: 'A bit about my',
      headingAccent: 'story',
      body: [
        'My name is <strong>Antonio Payá González</strong>. I\'m a Software Architect at <strong>TheNextPangea S.L.</strong> and hold a PhD in Computer Engineering from the <strong>University of Oviedo</strong>, with a research focus on Intelligent Systems.',
        'My research focuses on improving <em>Software-Defined Perimeters</em> (SDP) by integrating intrusion detection systems and optimizing identity management. I develop automated security configurations and improve IDS resilience against <em>Adversarial Machine Learning</em> attacks.',
        'I\'m also a writer and editor at <a href="https://medium.com/better-programming" target="_blank" rel="noopener" class="animated-link">Better Programming</a> and <a href="https://medium.com/coinmonks" target="_blank" rel="noopener" class="animated-link">Coinmonks</a> on Medium.',
      ],
      skills: ['Web Development', 'Machine Learning', 'Blockchain', 'Cybersecurity', 'Software Architecture', 'IoT'],
      stats: [
        { value: '7', label: 'Publications' },
        { value: '128+', label: 'Citations' },
        { value: '8', label: 'Honours' },
        { value: '3', label: 'Hackathons Won' },
      ],
    },

    // Experience
    experience: {
      eyebrow: 'Experience',
      heading: 'Professional',
      headingAccent: 'career',
      desc: 'Over 6 years of experience in software development, research, and architecture.',
      jobs: [
        {
          role: 'Software Architect',
          company: 'TheNextPangea S.L.',
          type: 'Full-time',
          period: 'Sept 2021 — Present',
          desc: 'Design of scalable and maintainable software architectures. The factory of intangible assets.',
          tags: ['Architecture', 'Full Stack', 'Cloud'],
          current: true,
          logo: 'logo-tnp.png',
          logoDark: false,
        },
        {
          role: 'R&D Software Engineer',
          company: 'Icube SL',
          type: 'Full-time',
          period: 'Oct 2019 — Sept 2021',
          desc: 'Research and development in additive manufacturing techniques. Collaboration with ArcelorMittal R&D.',
          tags: ['R&D', 'Additive Manufacturing'],
          current: false,
          logo: 'logo-icube.webp',
          logoDark: true,
        },
        {
          role: 'Blockchain Researcher',
          company: 'University of Oviedo Foundation',
          type: 'Scholarship',
          period: 'Apr 2018 — Aug 2019',
          desc: 'Research in Blockchain technologies and their market impact, focused on Hyperledger Fabric.',
          tags: ['Blockchain', 'Hyperledger', 'Research'],
          current: false,
          logo: 'logo-uniovi.jpg',
          logoDark: false,
        },
        {
          role: 'Junior Software Developer',
          company: 'ArcelorMittal',
          type: 'Internship',
          period: 'Jan 2019 — Mar 2019',
          desc: 'Blockchain deployment in a real industrial environment. Smart contracts and DLT technologies.',
          tags: ['DLT', 'Smart Contracts', 'Hyperledger Fabric'],
          current: false,
          logo: 'logo-arcelormittal.png',
          logoDark: true,
        },
      ],
    },

    // Education
    education: {
      eyebrow: 'Education',
      heading: 'Academic',
      headingAccent: 'background',
      desc: 'From bachelor\'s to PhD, with 8 distinctions along the way.',
      honorsLabel: '🏅 Distinctions',
      certsHeading: 'Certifications',
      degrees: [
        {
          title: 'PhD in Computer Engineering',
          school: 'University of Oviedo',
          period: '2021 — 2025',
          desc: 'Thesis focused on Software-Defined Perimeter, Intrusion Detection Systems, and Adversarial Machine Learning.',
          honors: [] as string[],
          current: true,
          logo: 'logo-uniovi.jpg',
        },
        {
          title: 'Master\'s in Web Engineering',
          school: 'University of Oviedo',
          period: '2019 — 2021',
          desc: 'Specialisation in advanced web development and modern architectures.',
          honors: ['Master\'s Thesis — Distinction'],
          current: false,
          logo: 'logo-uniovi.jpg',
        },
        {
          title: 'BSc in Software Engineering',
          school: 'University of Oviedo',
          period: '2015 — 2019',
          desc: 'Strong foundation in software engineering, algorithms, databases, and distributed systems.',
          honors: [
            'OS & Network Administration',
            'Computability',
            'Final Year Project — 10/10',
            'Industrial Placement',
            'Distributed Systems & Internet',
            'Operating Systems',
            'Robotics Software',
            'Programming Technology & Paradigms',
          ],
          current: false,
          logo: 'logo-uniovi.jpg',
        },
      ],
      certs: [
        { title: 'Machine Learning', issuer: 'Stanford · Coursera', year: 2020 },
        { title: 'Python & Django Full Stack Web Developer', issuer: 'Udemy', year: 2017 },
        { title: 'Angular: From Zero to Expert', issuer: 'Udemy', year: 2017 },
        { title: 'Automation with Selenium', issuer: 'COIIPA', year: 2016 },
      ],
    },

    // Skills
    skills: {
      eyebrow: 'Skills',
      heading: 'Technical',
      headingAccent: 'competencies',
      desc: 'Cloud, architecture, full stack development, and cybersecurity.',
      groups: [
        { label: 'Cloud & DevOps', icon: '☁️', techs: ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'CI/CD', 'MLOps'] },
        { label: 'Software Architecture', icon: '🏗️', techs: ['Microservices', 'DDD', 'Event-Driven', 'REST', 'GraphQL', 'gRPC'] },
        { label: 'Frontend', icon: '🖥️', techs: ['Astro', 'Angular', 'React', 'TypeScript', 'Tailwind', 'Vue'] },
        { label: 'Backend', icon: '⚡', techs: ['.NET Core', 'Python', 'Go', 'Rust', 'Node.js', 'Spring'] },
        { label: 'Desktop Apps', icon: '💻', techs: ['Tauri', 'Electron'] },
        { label: 'Machine Learning / AI', icon: '🤖', techs: ['Scikit-learn', 'TensorFlow', 'PyTorch', 'Adversarial ML', 'MLOps'] },
        { label: 'Blockchain', icon: '🔗', techs: ['Hyperledger Fabric', 'Solidity', 'Smart Contracts', 'DLT'] },
        { label: 'Cybersecurity', icon: '🔒', techs: ['SDP', 'Zero Trust', 'IDS / IPS', 'Pentesting'] },
      ],
      toolsHeading: 'Tools & Platforms',
      tools: ['Git', 'PostgreSQL', 'MongoDB', 'Redis', 'Linux', 'Nginx', 'RabbitMQ', 'Kafka', 'Figma'],
    },

    // Publications
    publications: {
      eyebrow: 'Publications',
      heading: 'Articles in',
      headingAccent: 'JCR journals',
      desc: 'Research published in high-impact international journals (Q1 & Q2).',
      stats: [
        { value: '7', label: 'Publications', icon: '📄' },
        { value: '128+', label: 'Citations', icon: '📊' },
        { value: '1.1K+', label: 'Reads', icon: '👁️' },
      ],
    },

    // Awards
    awards: {
      eyebrow: 'Awards',
      headingAccent: 'Recognitions',
      desc: 'Hackathons, cybersecurity competitions, and international film festivals.',
      items: [
        { title: 'INNCYBER Finalist', org: 'INCIBE', year: 'Oct 2020', desc: 'Finalist in the national cybersecurity and innovation competition.', icon: '🏆', color: 'var(--violet)' },
        { title: 'HP Hackathon Winner', org: 'HP Inc.', year: 'Nov 2019', desc: 'First prize at the hackathon organised by HP Spain.', icon: '🥇', color: 'var(--accent)' },
        { title: 'Salesforce Hackathon Winner', org: 'Salesforce', year: 'Apr 2019', desc: 'First prize developing innovative solutions with cloud technologies.', icon: '🥇', color: 'var(--cyan)' },
        { title: '2nd Place Capgemini', org: 'Capgemini', year: '2018', desc: 'Runner-up in the Capgemini Spain technology challenge.', icon: '🥈', color: 'var(--emerald)' },
        { title: 'Ajyal Film Festival Juror', org: 'Doha Film Institute', year: 'Dec 2014', desc: 'Selected as a member of the youth jury at the Doha festival, Qatar.', icon: '🎬', color: 'var(--rose)' },
        { title: 'Giffoni Film Festival Juror', org: 'Giffoni Experience', year: 'Jul 2014', desc: 'Member of the youth jury at the Giffoni film festival, Italy.', icon: '🎬', color: 'var(--rose)' },
      ],
    },

    // Contact
    contact: {
      eyebrow: 'Contact',
      heading: '',
      headingAccent: 'Let\'s Talk',
      headingSuffix: '?',
      text: 'Always open to new research opportunities, technical collaborations, or just a great conversation about technology.',
      terminalFile: 'contact.sh',
      terminalLines: [
        { prompt: '$', cmd: 'echo', arg: '"Let\'s talk!"' },
        { prompt: '$', cmd: 'mail', arg: '-s "Collaboration" antoniopaya@outlook.com' },
      ],
      cta: 'Send email',
    },

    // Footer
    footer: {
      copy: 'Software Architect · PhD Researcher',
      links: [
        { href: '#about', label: 'About' },
        { href: '#experience', label: 'Experience' },
        { href: '#publications', label: 'Publications' },
        { href: '#contact', label: 'Contact' },
      ],
      designed: 'Designed with',
      using: 'using',
    },
  },
} as const;

/** Section IDs per language */
export const sectionIds = {
  es: {
    about: 'sobre-mi',
    experience: 'experiencia',
    education: 'educacion',
    skills: 'skills',
    publications: 'publicaciones',
    awards: 'premios',
    contact: 'contacto',
  },
  en: {
    about: 'about',
    experience: 'experience',
    education: 'education',
    skills: 'skills',
    publications: 'publications',
    awards: 'awards',
    contact: 'contact',
  },
} as const;

export function t(lang: Lang) {
  return translations[lang];
}

export function ids(lang: Lang) {
  return sectionIds[lang];
}

/** Return the alternate language */
export function altLang(lang: Lang): Lang {
  return lang === 'es' ? 'en' : 'es';
}

/** Return the path for a given language */
export function langPath(lang: Lang, base: string): string {
  return lang === 'es' ? base : `${base}en/`;
}
