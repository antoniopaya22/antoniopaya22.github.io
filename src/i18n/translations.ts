export type Lang = 'es' | 'en';

export const translations = {
  es: {
    ui: {
      roles: ['Arquitecto de Software', 'Profesor en UNIR', 'PhD · Investigador en Ciberseguridad', 'Zero Trust & Cloud'],
      paletteHint: 'Buscar o ejecutar…',
      paletteOpen: 'Abrir paleta de comandos',
      paletteEmpty: 'Sin resultados',
      paletteGroups: { nav: 'Ir a', actions: 'Acciones', links: 'Enlaces' },
      paletteActions: { theme: 'Cambiar tema claro/oscuro', lang: 'Read in English', email: 'Copiar email', cv: 'Descargar CV', top: 'Volver arriba' },
      toastCopied: 'Email copiado al portapapeles',
      status: { ok: 'Todos los sistemas operativos', built: 'Build' },
      marquee: ['Zero Trust', 'Software-Defined Perimeter', 'Cloud Architecture', 'Terraform', 'Adversarial ML', 'Intrusion Detection', 'Kubernetes', 'MLOps', 'Security by Design', 'Docencia'],
    },

    term: {
      welcome: 'Bienvenido. Escribe <b>help</b> para ver los comandos.',
      placeholder: 'escribe un comando…',
      notFound: 'comando no encontrado:',
      help: [
        ['whoami', 'quién soy'],
        ['experience', 'trayectoria profesional'],
        ['teaching', 'docencia en UNIR'],
        ['projects', 'proyectos open source'],
        ['publications', 'publicaciones'],
        ['skills', 'stack técnico'],
        ['contact', 'cómo contactarme'],
        ['cv', 'descargar CV'],
        ['theme', 'cambiar tema'],
        ['clear', 'limpiar terminal'],
      ],
      whoami: 'Antonio Payá González — Arquitecto de Software @ TheNextPangea · Profesor @ UNIR · PhD en Ingeniería Informática (Universidad de Oviedo).',
      sudo: 'Buen intento. Este incidente será reportado. 🔒',
      cv: 'Descargando CV…',
      theme: 'Tema cambiado.',
      ctf: {
        teaser: '🏁 Hay una flag escondida en esta terminal. ¿Te atreves? Empieza por mirar lo que no se ve.',
        hint: 'Nada aquí está en claro. Primero, base64. Después, César se queda a medio camino (13). Herramientas: base64 -d, rot13. Envía la flag con: submit FLAG{...}',
        usage: 'uso: submit FLAG{...}',
        ok: '✔ ¡Flag correcta! Acceso concedido. Si has llegado hasta aquí, escríbeme: me encantará conocerte.',
        ko: '✘ Flag incorrecta. Sigue intentándolo.',
        solved: 'Reto completado 🏆',
      },
    },

    meta: {
      title: 'Antonio Payá González — Arquitecto de Software, Profesor en UNIR & PhD',
      description: 'Antonio Payá González — Arquitecto de Software en TheNextPangea, profesor en UNIR (Grado y Máster en Ciberseguridad) y Doctor en Ingeniería Informática por la Universidad de Oviedo. Especialista en ciberseguridad, Zero Trust, cloud e IA.',
      skip: 'Saltar al contenido',
    },

    header: {
      home: 'Inicio',
      menu: 'Menú',
      close: 'Cerrar',
      theme: 'Cambiar tema claro/oscuro',
      switchLang: 'Read in English',
    },

    hero: {
      kicker: 'Arquitecto de Software · Profesor · Investigador',
      status: 'Abierto a colaboraciones',
      statement: 'Diseño software que <em>escala</em>, enseño a <em>protegerlo</em> e investigo cómo hacerlo más <em>seguro</em>.',
      intro: 'Arquitecto de Software en TheNextPangea, profesor en la Universidad Internacional de La Rioja (UNIR) y Doctor en Ingeniería Informática por la Universidad de Oviedo.',
      ctaPrimary: 'Contactar',
      ctaCv: 'Descargar CV',
      figure: 'Fig. 01 — Antonio Payá González',
      spec: [
        { k: 'Actualmente', v: 'Arquitecto de Software', s: 'TheNextPangea' },
        { k: 'Docencia', v: 'Profesor', s: 'UNIR — desde 2026' },
        { k: 'Doctorado', v: 'PhD Ing. Informática', s: 'Universidad de Oviedo' },
        { k: 'Investigación', v: 'SDP · Zero Trust', s: 'IDS · Adversarial ML' },
      ],
      metrics: [
        { value: '4', label: 'Artículos JCR' },
        { value: '200+', label: 'Citas' },
        { value: '8+', label: 'Años de experiencia' },
        { value: '3', label: 'Titulaciones en UNIR' },
        { value: '2', label: 'Hackathons ganados' },
      ],
    },

    sections: {
      about: { n: '01', file: 'perfil.md', title: 'Perfil', desc: 'Entre la industria, la universidad y la investigación.' },
      experience: { n: '02', file: 'git log --graph', title: 'Experiencia', desc: 'Más de 8 años en arquitectura de software, investigación y docencia.' },
      teaching: { n: '03', file: 'docencia.yaml', title: 'Docencia', desc: 'Profesor en UNIR desde septiembre de 2026, en titulaciones oficiales de grado y máster.' },
      projects: { n: '04', file: 'repos/', title: 'Proyectos', desc: 'Código abierto: plantillas usadas por la comunidad e implementaciones de mi investigación.' },
      research: { n: '05', file: 'publicaciones.bib', title: 'Investigación', desc: '4 artículos en revistas internacionales JCR y 1 preprint, como primer autor.' },
      education: { n: '06', file: 'formacion.json', title: 'Formación', desc: 'Del grado al doctorado, con 8 matrículas de honor.' },
      skills: { n: '07', file: 'stack/', title: 'Competencias', desc: 'Stack técnico con el que diseño, construyo y despliego.' },
      awards: { n: '08', file: 'premios.txt', title: 'Premios', desc: 'Hackathons, competiciones y festivales internacionales.' },
      contact: { n: '09', file: 'contacto.sh', title: 'Contacto', desc: 'Investigación, arquitectura, charlas o docencia.' },
    },

    about: {
      lead: 'Soy <strong>Arquitecto de Software</strong> en TheNextPangea, <strong>profesor</strong> en UNIR y <strong>PhD en Ingeniería Informática</strong> por la Universidad de Oviedo, con línea de investigación en Ingeniería del Software.',
      body: [
        'En la industria diseño soluciones escalables que llevan la <em>Inteligencia Artificial</em> a producción, sobre arquitecturas cloud en AWS, Azure y GCP y con la infraestructura automatizada mediante Terraform.',
        'Mi tesis doctoral mejora los <em>Software-Defined Perimeters</em> integrando sistemas de detección de intrusiones y gestión de identidades, y refuerza los IDS frente a ataques de <em>Adversarial Machine Learning</em>.',
        'Desde septiembre de 2026 imparto docencia en UNIR en el Grado en Ciberseguridad, el Máster Universitario en Ciberseguridad y el Máster Universitario en Transformación Digital mediante Tecnologías Disruptivas. También escribo y edito en Better Programming y Coinmonks.',
      ],
      focusTitle: 'Áreas de foco',
      focus: [
        { title: 'Arquitectura & Cloud', desc: 'Sistemas distribuidos en AWS, Azure y GCP. IaC con Terraform.' },
        { title: 'Ciberseguridad & Zero Trust', desc: 'SDP, IDS y Security by Design.' },
        { title: 'IA en producción', desc: 'MLOps, productivización de modelos y Adversarial ML.' },
        { title: 'Docencia universitaria', desc: 'Ciberseguridad y transformación digital en UNIR.' },
      ],
      facts: [
        { k: 'Ubicación', v: 'Gijón, Asturias, España' },
        { k: 'Idiomas', v: 'Español (nativo) · Inglés (profesional)' },
      ],
    },

    experience: {
      current: 'Actual',
      jobs: [
        {
          role: 'Profesor',
          company: 'UNIR — Universidad Internacional de La Rioja',
          type: 'Docencia universitaria',
          period: 'Sept 2026 — Actualidad',
          points: [
            'Grado en Ciberseguridad.',
            'Máster Universitario en Ciberseguridad.',
            'Máster Universitario en Transformación Digital mediante Tecnologías Disruptivas.',
          ],
          tags: ['Docencia', 'Ciberseguridad', 'Transformación Digital'],
          current: true,
          logo: 'logo-unir.png',
          logoOnDark: false,
        },
        {
          role: 'Arquitecto de Software',
          company: 'TheNextPangea S.L.',
          type: 'Jornada completa',
          period: 'Sept 2021 — Actualidad',
          points: [
            'Definición de metodologías de desarrollo (SDLC) y stacks tecnológicos.',
            'Diseño de arquitecturas cloud escalables en AWS, Azure y GCP.',
            'Productivización de modelos de IA en entornos de producción.',
            'Automatización de infraestructura con Terraform (IaC) y Security by Design.',
          ],
          tags: ['Architecture', 'Cloud', 'AI/ML', 'Terraform', 'Security'],
          current: true,
          logo: 'logo-tnp.png',
          logoOnDark: true,
        },
        {
          role: 'Ingeniero I+D de Software',
          company: 'Icube SL',
          type: 'Jornada completa',
          period: 'Oct 2019 — Sept 2021',
          points: ['Investigación y desarrollo en técnicas de additive manufacturing en colaboración con ArcelorMittal R&D.'],
          tags: ['R&D', 'Additive Manufacturing'],
          current: false,
          logo: 'logo-icube-trim.webp',
          logoOnDark: false,
        },
        {
          role: 'Investigador en Blockchain',
          company: 'Fundación Universidad de Oviedo',
          type: 'Beca',
          period: 'Abr 2018 — Ago 2019',
          points: ['Investigación en tecnologías blockchain y su impacto en el mercado, centrada en Hyperledger Fabric.'],
          tags: ['Blockchain', 'Hyperledger', 'Research'],
          current: false,
          logo: 'logo-uniovi-crest.webp',
          logoOnDark: false,
        },
        {
          role: 'Junior Software Developer',
          company: 'ArcelorMittal',
          type: 'Prácticas',
          period: 'Ene 2019 — Mar 2019',
          points: ['Despliegue de blockchain en un entorno industrial real: smart contracts y tecnologías DLT.'],
          tags: ['DLT', 'Smart Contracts', 'Hyperledger Fabric'],
          current: false,
          logo: 'logo-arcelormittal-trim.png',
          logoOnDark: false,
        },
      ],
    },

    teaching: {
      institution: 'UNIR — Universidad Internacional de La Rioja',
      since: 'Desde septiembre de 2026',
      linkLabel: 'Ver titulación',
      programs: [
        { level: 'Grado', title: 'Grado en Ciberseguridad', meta: 'Oficial · 240 ECTS', url: 'https://www.unir.net/ingenieria/grado-ciberseguridad/' },
        { level: 'Máster', title: 'Máster Universitario en Ciberseguridad', meta: 'Oficial · 60 ECTS', url: 'https://www.unir.net/ingenieria/master-seguridad-informatica/' },
        { level: 'Máster', title: 'Máster Universitario en Transformación Digital mediante Tecnologías Disruptivas', meta: 'Oficial · 60 ECTS', url: 'https://www.unir.net/ingenieria/master-transformacion-digital-tecnologias-disruptivas/' },
      ],
      note: 'Abierto a charlas, seminarios y colaboraciones académicas en ciberseguridad, Zero Trust, arquitectura cloud e IA.',
    },

    projects: {
      paper: 'Paper',
      repo: 'Repositorio',
      updated: 'actualizado',
      more: 'Ver todos los repositorios',
      items: {
        'go-rest-template': 'Plantilla de API REST en Go con Gin lista para producción: estructura por capas, configuración, ORM, Docker y tests.',
        apollon: 'Sistema de defensa frente a ataques de Adversarial Machine Learning en sistemas de detección de intrusiones.',
        'Software-Defined-Perimeter': 'Despliegue automatizado y seguro del framework Software-Defined Perimeter con fingerprinting avanzado.',
        egida: 'DSL para desplegar infraestructuras altamente seguras (hardening de SO) con detección temprana de errores.',
        SimpleSDP: 'Implementación sencilla de un Software-Defined Perimeter para acceso a red Zero Trust.',
        'project-agent-harness': 'Harness para agentes de código: backlog verificable, roles especializados y comandos automatizados.',
      },
    },

    research: {
      thesisLabel: 'Tesis doctoral',
      thesis: 'Mejora de los Software-Defined Perimeters mediante la integración de sistemas de detección de intrusiones, gestión de identidades y defensa frente a Adversarial Machine Learning.',
      metrics: [
        { value: '4', label: 'Artículos JCR' },
        { value: '200+', label: 'Citas (Scholar)' },
        { value: '4', label: 'Índice h' },
      ],
      pubsTitle: 'Publicaciones',
      articlesTitle: 'Divulgación técnica',
      articles: [
        { title: 'Creando una API Rest lista para producción con Go', venue: 'Medium', year: 2020, url: 'https://medium.com/@antonioalfa22/creando-una-api-rest-lista-para-producci%C3%B3n-con-go-d4ae6af08a1f' },
        { title: 'How to Develop Safer Applications in Node.js', venue: 'Better Programming', year: 2020, url: 'https://medium.com/better-programming/developing-safer-applications-in-nodejs-f645788f9c65' },
        { title: 'Blockchain Frameworks (serie de 4 partes)', venue: 'Coinmonks', year: 2020, url: 'https://medium.com/coinmonks/blockchain-frameworks-part-1-introduction-307846125c71' },
        { title: 'Creando una API Rest con Hyperledger Fabric', venue: 'Medium', year: 2018, url: 'https://medium.com/@antonioalfa22/creando-una-api-rest-con-hyperledger-fabric-e22675f97e98' },
      ],
    },

    education: {
      honorsLabel: 'Matrículas de Honor',
      certsTitle: 'Certificaciones',
      degrees: [
        {
          title: 'Doctorado en Ingeniería Informática',
          school: 'Universidad de Oviedo',
          period: '2021 — 2025',
          desc: 'Tesis sobre Software-Defined Perimeter, Intrusion Detection Systems y Adversarial Machine Learning.',
          honors: [] as string[],
        },
        {
          title: 'Máster en Ingeniería Web',
          school: 'Universidad de Oviedo',
          period: '2019 — 2021',
          desc: 'Desarrollo web avanzado y arquitecturas modernas.',
          honors: ['Trabajo Fin de Máster'],
        },
        {
          title: 'Grado en Ingeniería del Software',
          school: 'Universidad de Oviedo',
          period: '2015 — 2019',
          desc: 'Ingeniería del software, algoritmos, bases de datos y sistemas distribuidos. Proyecto Fin de Grado: 10/10.',
          honors: [
            'Administración de SO y Redes',
            'Computabilidad',
            'Proyecto Fin de Grado',
            'Prácticas en Empresa',
            'Sistemas Distribuidos e Internet',
            'Sistemas Operativos',
            'Software para Robots',
            'Tecnología y Paradigmas de la Programación',
          ],
        },
      ],
      certs: [
        { title: 'IA & Machine Learning', issuer: 'AWS Innovate', year: 2023 },
        { title: 'Deep Learning & Neural Networks con Keras', issuer: 'IBM', year: 2021 },
        { title: 'Machine Learning', issuer: 'Stanford · Coursera', year: 2020 },
        { title: 'Python & Django Full Stack Web Developer', issuer: 'Udemy', year: 2017 },
        { title: 'Angular: De 0 a experto', issuer: 'Udemy', year: 2017 },
        { title: 'Automatización con Selenium', issuer: 'COIIPA', year: 2016 },
      ],
    },

    skills: {
      groups: [
        { label: 'Cloud & DevOps', items: ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'CI/CD'] },
        { label: 'Arquitectura', items: ['Microservicios', 'DDD', 'Event-Driven', 'REST', 'GraphQL', 'gRPC'] },
        { label: 'Ciberseguridad', items: ['Zero Trust', 'SDP', 'IDS / IPS', 'Hardening', 'Pentesting'] },
        { label: 'IA / ML', items: ['scikit-learn', 'TensorFlow', 'PyTorch', 'Adversarial ML', 'MLOps'] },
        { label: 'Backend', items: ['.NET', 'Python', 'Go', 'Rust', 'Node.js', 'Spring'] },
        { label: 'Frontend & Desktop', items: ['TypeScript', 'Astro', 'Angular', 'React', 'Vue', 'Tauri'] },
        { label: 'Datos & Mensajería', items: ['PostgreSQL', 'MongoDB', 'Redis', 'Kafka', 'RabbitMQ'] },
        { label: 'Blockchain', items: ['Hyperledger Fabric', 'Solidity', 'Smart Contracts'] },
      ],
    },

    awards: {
      items: [
        { title: 'Finalista INNCYBER', org: 'INCIBE', year: '2020', desc: 'Competición nacional de ciberseguridad e innovación.' },
        { title: 'Ganador HP Hackathon', org: 'HP Inc.', year: '2019', desc: 'Primer premio en el hackathon de HP España.' },
        { title: 'Ganador Salesforce Hackathon', org: 'Salesforce', year: '2019', desc: 'Primer premio con soluciones sobre tecnologías cloud.' },
        { title: '2º puesto Capgemini Challenge', org: 'Capgemini', year: '2018', desc: 'Desafío tecnológico de Capgemini España.' },
        { title: 'Jurado Ajyal Film Festival', org: 'Doha Film Institute', year: '2014', desc: 'Jurado joven del festival de Doha, Qatar.' },
        { title: 'Jurado Giffoni Film Festival', org: 'Giffoni Experience', year: '2014', desc: 'Jurado juvenil del festival de Giffoni, Italia.' },
      ],
    },

    contact: {
      heading: '¿Hablamos?',
      text: 'Colaboraciones de investigación, proyectos de arquitectura y ciberseguridad, charlas o actividades docentes. Escríbeme y te respondo.',
      copy: 'Copiar',
      copied: 'Copiado',
      elsewhere: 'En otros sitios',
    },

    footer: {
      role: 'Arquitecto de Software · Profesor en UNIR · PhD',
      updated: 'Actualizado',
      top: 'Volver arriba',
    },
  },

  en: {
    ui: {
      roles: ['Software Architect', 'Professor at UNIR', 'PhD · Security Researcher', 'Zero Trust & Cloud'],
      paletteHint: 'Search or run…',
      paletteOpen: 'Open command palette',
      paletteEmpty: 'No results',
      paletteGroups: { nav: 'Go to', actions: 'Actions', links: 'Links' },
      paletteActions: { theme: 'Toggle light/dark theme', lang: 'Leer en español', email: 'Copy email', cv: 'Download CV', top: 'Back to top' },
      toastCopied: 'Email copied to clipboard',
      status: { ok: 'All systems operational', built: 'Build' },
      marquee: ['Zero Trust', 'Software-Defined Perimeter', 'Cloud Architecture', 'Terraform', 'Adversarial ML', 'Intrusion Detection', 'Kubernetes', 'MLOps', 'Security by Design', 'Teaching'],
    },

    term: {
      welcome: 'Welcome. Type <b>help</b> to list the commands.',
      placeholder: 'type a command…',
      notFound: 'command not found:',
      help: [
        ['whoami', 'who I am'],
        ['experience', 'professional career'],
        ['teaching', 'teaching at UNIR'],
        ['projects', 'open source projects'],
        ['publications', 'publications'],
        ['skills', 'tech stack'],
        ['contact', 'how to reach me'],
        ['cv', 'download CV'],
        ['theme', 'toggle theme'],
        ['clear', 'clear terminal'],
      ],
      whoami: 'Antonio Payá González — Software Architect @ TheNextPangea · Professor @ UNIR · PhD in Computer Engineering (University of Oviedo).',
      sudo: 'Nice try. This incident will be reported. 🔒',
      cv: 'Downloading CV…',
      theme: 'Theme switched.',
      ctf: {
        teaser: '🏁 There is a flag hidden in this terminal. Up for it? Start by looking at what is not visible.',
        hint: 'Nothing here is in plain text. First, base64. Then Caesar stops halfway (13). Tools: base64 -d, rot13. Submit the flag with: submit FLAG{...}',
        usage: 'usage: submit FLAG{...}',
        ok: '✔ Correct flag! Access granted. If you made it this far, drop me a line: I would love to meet you.',
        ko: '✘ Wrong flag. Keep trying.',
        solved: 'Challenge solved 🏆',
      },
    },

    meta: {
      title: 'Antonio Payá González — Software Architect, Professor at UNIR & PhD',
      description: 'Antonio Payá González — Software Architect at TheNextPangea, professor at UNIR (Cybersecurity BSc & MSc) and PhD in Computer Engineering from the University of Oviedo. Specialist in cybersecurity, Zero Trust, cloud and AI.',
      skip: 'Skip to content',
    },

    header: {
      home: 'Home',
      menu: 'Menu',
      close: 'Close',
      theme: 'Toggle light/dark theme',
      switchLang: 'Leer en español',
    },

    hero: {
      kicker: 'Software Architect · Professor · Researcher',
      status: 'Open to collaborations',
      statement: 'I design software that <em>scales</em>, teach how to <em>protect</em> it, and research how to make it more <em>secure</em>.',
      intro: 'Software Architect at TheNextPangea, professor at the International University of La Rioja (UNIR) and PhD in Computer Engineering from the University of Oviedo.',
      ctaPrimary: 'Get in touch',
      ctaCv: 'Download CV',
      figure: 'Fig. 01 — Antonio Payá González',
      spec: [
        { k: 'Currently', v: 'Software Architect', s: 'TheNextPangea' },
        { k: 'Teaching', v: 'Professor', s: 'UNIR — since 2026' },
        { k: 'Doctorate', v: 'PhD Computer Eng.', s: 'University of Oviedo' },
        { k: 'Research', v: 'SDP · Zero Trust', s: 'IDS · Adversarial ML' },
      ],
      metrics: [
        { value: '4', label: 'JCR articles' },
        { value: '200+', label: 'Citations' },
        { value: '8+', label: 'Years of experience' },
        { value: '3', label: 'UNIR programmes' },
        { value: '2', label: 'Hackathons won' },
      ],
    },

    sections: {
      about: { n: '01', file: 'profile.md', title: 'Profile', desc: 'Between industry, academia and research.' },
      experience: { n: '02', file: 'git log --graph', title: 'Experience', desc: 'Over 8 years in software architecture, research and teaching.' },
      teaching: { n: '03', file: 'teaching.yaml', title: 'Teaching', desc: "Professor at UNIR since September 2026, in official bachelor's and master's degrees." },
      projects: { n: '04', file: 'repos/', title: 'Projects', desc: 'Open source: community-used templates and implementations of my research.' },
      research: { n: '05', file: 'publications.bib', title: 'Research', desc: '4 articles in international JCR journals and 1 preprint, all as first author.' },
      education: { n: '06', file: 'education.json', title: 'Education', desc: "From bachelor's to PhD, with 8 distinctions." },
      skills: { n: '07', file: 'stack/', title: 'Skills', desc: 'The stack I design, build and ship with.' },
      awards: { n: '08', file: 'awards.txt', title: 'Awards', desc: 'Hackathons, competitions and international festivals.' },
      contact: { n: '09', file: 'contact.sh', title: 'Contact', desc: 'Research, architecture, talks or teaching.' },
    },

    about: {
      lead: "I'm a <strong>Software Architect</strong> at TheNextPangea, a <strong>professor</strong> at UNIR and hold a <strong>PhD in Computer Engineering</strong> from the University of Oviedo, with a research focus on Software Engineering.",
      body: [
        'In industry I design scalable solutions that bring <em>Artificial Intelligence</em> into production, on cloud architectures across AWS, Azure and GCP, with infrastructure automated through Terraform.',
        'My doctoral thesis improves <em>Software-Defined Perimeters</em> by integrating intrusion detection and identity management, and hardens IDS against <em>Adversarial Machine Learning</em> attacks.',
        "Since September 2026 I teach at UNIR in the Bachelor's Degree in Cybersecurity, the Master's Degree in Cybersecurity and the Master's Degree in Digital Transformation through Disruptive Technologies. I also write and edit for Better Programming and Coinmonks.",
      ],
      focusTitle: 'Focus areas',
      focus: [
        { title: 'Architecture & Cloud', desc: 'Distributed systems on AWS, Azure and GCP. IaC with Terraform.' },
        { title: 'Cybersecurity & Zero Trust', desc: 'SDP, IDS and Security by Design.' },
        { title: 'AI in production', desc: 'MLOps, model productization and Adversarial ML.' },
        { title: 'University teaching', desc: 'Cybersecurity and digital transformation at UNIR.' },
      ],
      facts: [
        { k: 'Location', v: 'Gijón, Asturias, Spain' },
        { k: 'Languages', v: 'Spanish (native) · English (professional)' },
      ],
    },

    experience: {
      current: 'Current',
      jobs: [
        {
          role: 'Professor',
          company: 'UNIR — International University of La Rioja',
          type: 'University teaching',
          period: 'Sept 2026 — Present',
          points: [
            "Bachelor's Degree in Cybersecurity.",
            "Master's Degree in Cybersecurity.",
            "Master's Degree in Digital Transformation through Disruptive Technologies.",
          ],
          tags: ['Teaching', 'Cybersecurity', 'Digital Transformation'],
          current: true,
          logo: 'logo-unir.png',
          logoOnDark: false,
        },
        {
          role: 'Software Architect',
          company: 'TheNextPangea S.L.',
          type: 'Full-time',
          period: 'Sept 2021 — Present',
          points: [
            'Defining software development methodologies (SDLC) and technology stacks.',
            'Designing scalable cloud architectures on AWS, Azure and GCP.',
            'Productionizing AI models in production environments.',
            'Infrastructure automation with Terraform (IaC) and Security by Design.',
          ],
          tags: ['Architecture', 'Cloud', 'AI/ML', 'Terraform', 'Security'],
          current: true,
          logo: 'logo-tnp.png',
          logoOnDark: true,
        },
        {
          role: 'R&D Software Engineer',
          company: 'Icube SL',
          type: 'Full-time',
          period: 'Oct 2019 — Sept 2021',
          points: ['Research and development in additive manufacturing techniques in collaboration with ArcelorMittal R&D.'],
          tags: ['R&D', 'Additive Manufacturing'],
          current: false,
          logo: 'logo-icube-trim.webp',
          logoOnDark: false,
        },
        {
          role: 'Blockchain Researcher',
          company: 'University of Oviedo Foundation',
          type: 'Scholarship',
          period: 'Apr 2018 — Aug 2019',
          points: ['Research on blockchain technologies and their market impact, focused on Hyperledger Fabric.'],
          tags: ['Blockchain', 'Hyperledger', 'Research'],
          current: false,
          logo: 'logo-uniovi-crest.webp',
          logoOnDark: false,
        },
        {
          role: 'Junior Software Developer',
          company: 'ArcelorMittal',
          type: 'Internship',
          period: 'Jan 2019 — Mar 2019',
          points: ['Blockchain deployment in a real industrial environment: smart contracts and DLT.'],
          tags: ['DLT', 'Smart Contracts', 'Hyperledger Fabric'],
          current: false,
          logo: 'logo-arcelormittal-trim.png',
          logoOnDark: false,
        },
      ],
    },

    teaching: {
      institution: 'UNIR — International University of La Rioja',
      since: 'Since September 2026',
      linkLabel: 'View programme',
      programs: [
        { level: "Bachelor's", title: "Bachelor's Degree in Cybersecurity", meta: 'Official · 240 ECTS', url: 'https://www.unir.net/ingenieria/grado-ciberseguridad/' },
        { level: "Master's", title: "Master's Degree in Cybersecurity", meta: 'Official · 60 ECTS', url: 'https://www.unir.net/ingenieria/master-seguridad-informatica/' },
        { level: "Master's", title: "Master's Degree in Digital Transformation through Disruptive Technologies", meta: 'Official · 60 ECTS', url: 'https://www.unir.net/ingenieria/master-transformacion-digital-tecnologias-disruptivas/' },
      ],
      note: 'Open to talks, seminars and academic collaborations on cybersecurity, Zero Trust, cloud architecture and AI.',
    },

    projects: {
      paper: 'Paper',
      repo: 'Repository',
      updated: 'updated',
      more: 'See all repositories',
      items: {
        'go-rest-template': 'Production-ready Go REST API template with Gin: layered structure, configuration, ORM, Docker and tests.',
        apollon: 'Defence system against Adversarial Machine Learning attacks on intrusion detection systems.',
        'Software-Defined-Perimeter': 'Automated, secure deployment of the Software-Defined Perimeter framework with advanced fingerprinting.',
        egida: 'DSL to deploy highly secure infrastructures (OS hardening) with early error detection.',
        SimpleSDP: 'Simple Software-Defined Perimeter implementation for Zero Trust network access.',
        'project-agent-harness': 'Harness for coding agents: verifiable backlog, specialised roles and automated commands.',
      },
    },

    research: {
      thesisLabel: 'Doctoral thesis',
      thesis: 'Improving Software-Defined Perimeters through integrated intrusion detection, identity management and defences against Adversarial Machine Learning.',
      metrics: [
        { value: '4', label: 'JCR articles' },
        { value: '200+', label: 'Citations (Scholar)' },
        { value: '4', label: 'h-index' },
      ],
      pubsTitle: 'Publications',
      articlesTitle: 'Technical writing',
      articles: [
        { title: 'Creating a Production-Ready REST API With Go', venue: 'The Startup', year: 2020, url: 'https://medium.com/swlh/creating-a-production-ready-rest-api-with-go-6d91c5b09add' },
        { title: 'How to Develop Safer Applications in Node.js', venue: 'Better Programming', year: 2020, url: 'https://medium.com/better-programming/developing-safer-applications-in-nodejs-f645788f9c65' },
        { title: 'Blockchain Frameworks (4-part series)', venue: 'Coinmonks', year: 2020, url: 'https://medium.com/coinmonks/blockchain-frameworks-part-1-introduction-307846125c71' },
        { title: 'Creando una API Rest con Hyperledger Fabric (ES)', venue: 'Medium', year: 2018, url: 'https://medium.com/@antonioalfa22/creando-una-api-rest-con-hyperledger-fabric-e22675f97e98' },
      ],
    },

    education: {
      honorsLabel: 'Distinctions',
      certsTitle: 'Certifications',
      degrees: [
        {
          title: 'PhD in Computer Engineering',
          school: 'University of Oviedo',
          period: '2021 — 2025',
          desc: 'Thesis on Software-Defined Perimeter, Intrusion Detection Systems and Adversarial Machine Learning.',
          honors: [] as string[],
        },
        {
          title: "Master's in Web Engineering",
          school: 'University of Oviedo',
          period: '2019 — 2021',
          desc: 'Advanced web development and modern architectures.',
          honors: ["Master's Thesis"],
        },
        {
          title: 'BSc in Software Engineering',
          school: 'University of Oviedo',
          period: '2015 — 2019',
          desc: 'Software engineering, algorithms, databases and distributed systems. Final year project: 10/10.',
          honors: [
            'OS & Network Administration',
            'Computability',
            'Final Year Project',
            'Industrial Placement',
            'Distributed Systems & Internet',
            'Operating Systems',
            'Robotics Software',
            'Programming Technology & Paradigms',
          ],
        },
      ],
      certs: [
        { title: 'AI & Machine Learning', issuer: 'AWS Innovate', year: 2023 },
        { title: 'Deep Learning & Neural Networks with Keras', issuer: 'IBM', year: 2021 },
        { title: 'Machine Learning', issuer: 'Stanford · Coursera', year: 2020 },
        { title: 'Python & Django Full Stack Web Developer', issuer: 'Udemy', year: 2017 },
        { title: 'Angular: From Zero to Expert', issuer: 'Udemy', year: 2017 },
        { title: 'Automation with Selenium', issuer: 'COIIPA', year: 2016 },
      ],
    },

    skills: {
      groups: [
        { label: 'Cloud & DevOps', items: ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'CI/CD'] },
        { label: 'Architecture', items: ['Microservices', 'DDD', 'Event-Driven', 'REST', 'GraphQL', 'gRPC'] },
        { label: 'Cybersecurity', items: ['Zero Trust', 'SDP', 'IDS / IPS', 'Hardening', 'Pentesting'] },
        { label: 'AI / ML', items: ['scikit-learn', 'TensorFlow', 'PyTorch', 'Adversarial ML', 'MLOps'] },
        { label: 'Backend', items: ['.NET', 'Python', 'Go', 'Rust', 'Node.js', 'Spring'] },
        { label: 'Frontend & Desktop', items: ['TypeScript', 'Astro', 'Angular', 'React', 'Vue', 'Tauri'] },
        { label: 'Data & Messaging', items: ['PostgreSQL', 'MongoDB', 'Redis', 'Kafka', 'RabbitMQ'] },
        { label: 'Blockchain', items: ['Hyperledger Fabric', 'Solidity', 'Smart Contracts'] },
      ],
    },

    awards: {
      items: [
        { title: 'INNCYBER Finalist', org: 'INCIBE', year: '2020', desc: 'National cybersecurity and innovation competition.' },
        { title: 'HP Hackathon Winner', org: 'HP Inc.', year: '2019', desc: 'First prize at the HP Spain hackathon.' },
        { title: 'Salesforce Hackathon Winner', org: 'Salesforce', year: '2019', desc: 'First prize with cloud-based solutions.' },
        { title: '2nd place, Capgemini Challenge', org: 'Capgemini', year: '2018', desc: 'Capgemini Spain technology challenge.' },
        { title: 'Ajyal Film Festival Juror', org: 'Doha Film Institute', year: '2014', desc: 'Youth jury at the Doha festival, Qatar.' },
        { title: 'Giffoni Film Festival Juror', org: 'Giffoni Experience', year: '2014', desc: 'Youth jury at the Giffoni festival, Italy.' },
      ],
    },

    contact: {
      heading: "Let's talk.",
      text: "Research collaborations, architecture and cybersecurity projects, talks or teaching. Drop me a line and I'll get back to you.",
      copy: 'Copy',
      copied: 'Copied',
      elsewhere: 'Elsewhere',
    },

    footer: {
      role: 'Software Architect · Professor at UNIR · PhD',
      updated: 'Updated',
      top: 'Back to top',
    },
  },
} as const;

/** Section anchors per language */
export const sectionIds = {
  es: {
    about: 'perfil',
    experience: 'experiencia',
    teaching: 'docencia',
    projects: 'proyectos',
    research: 'investigacion',
    education: 'formacion',
    skills: 'competencias',
    awards: 'premios',
    contact: 'contacto',
  },
  en: {
    about: 'profile',
    experience: 'experience',
    teaching: 'teaching',
    projects: 'projects',
    research: 'research',
    education: 'education',
    skills: 'skills',
    awards: 'awards',
    contact: 'contact',
  },
} as const;

export type SectionKey = keyof typeof sectionIds.es;

/** Sections shown in the main navigation, in order */
export const navSections: SectionKey[] = ['about', 'experience', 'teaching', 'projects', 'research', 'education', 'skills', 'contact'];

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
