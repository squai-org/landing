/* ---------------------------------------------------------------------------
   Site content.
   Copy carries the brand through how things are said. No "misión / visión"
   panels anywhere. Voice: humana, directa, juguetona, curiosa, sin humo.
--------------------------------------------------------------------------- */

export interface NavLink {
  label: string;
  target: string;
  href?: string;
}

export const navLinks: NavLink[] = [
  { label: 'Qué hacemos', target: 'que-hacemos' },
  { label: 'Servicios', target: 'servicios' },
  { label: 'Equipo', target: 'equipo' },
  { label: 'Preguntas frecuentes', target: 'faq' },
];

export const tagline = 'Aprende IA, potencia tus habilidades.';

/* --- Hero ---------------------------------------------------------------- */

/** The verb cycles; the rest of the headline is fixed. */
export const heroVerbs = [
  { word: 'Aprende', color: '#8A8EF9' },
  { word: 'Practica', color: '#44D4C8' },
  { word: 'Integra', color: '#F9C24D' },
  { word: 'Adopta', color: '#F4F6FF' },
];

export const heroLines = { object: 'IA.', middle: 'potencia tus', last: 'Habilidades.' };

export const heroSubtitle = 'Entrenamiento en inteligencia artificial para personas, equipos y comunidades educativas.';

/* --- Cohorte abierta (hero eyebrow) --------------------------------------- */

export interface Cohort {
  status: string;
  name: string;
  ecosystem: string;
  duration: string;
  schedule: string;
  modality: string;
  seats: string;
}

export const cohort: Cohort = {
  status: 'Cohorte abierta',
  name: 'Fundamentos de Inteligencia Artificial Generativa',
  ecosystem: 'Squai One',
  duration: '5 semanas · 20 horas',
  schedule: 'Martes y jueves, 6:30 p. m. a 8:30 p. m. (hora Colombia)',
  modality: '100% virtual, en vivo y con grabaciones',
  seats: 'Cupos limitados · inscripción por lista de espera',
};

/* --- Statement bajo el hero ----------------------------------------------- */

export const statement = {
  headline: 'Hacemos que la IA deje de ser un tema de expertos y se vuelva algo que cualquiera usa bien.',
  body: [
    'Casi nadie se estrella con la IA por falta de capacidad. Se estrella porque nadie le explicó la lógica de fondo: le pide algo y recibe cualquier cosa, ve salir una herramienta nueva cada semana y siente que va tarde, sabe que ahí hay horas ahorradas pero no encuentra por dónde entrar.',
    'Nosotros empezamos por que entiendas cómo funciona, seguimos poniéndote a usarla con tus propios casos, y solo entonces aparece lo que puedes hacer con ella. Somos formadores, ingenieros, analistas de datos, gente de procesos y de seguridad que trabaja con estas herramientas todos los días y las enseña como se las explicaría a un amigo. Somos Squai.',
  ],
};

/* --- Qué hacemos ---------------------------------------------------------- */

export const whatWeDo = {
  title: 'Qué hacemos',
  body: 'Llevamos la IA a personas, equipos y comunidades educativas: enseñamos cómo funciona, acompañamos a quienes tienen que usarla todos los días y ayudamos a decidir dónde aplicarla y dónde no. Una sola metodología, ajustada al contexto de cada quien.',
};

export interface Capability {
  t: string;
  d: string;
  span: string;
  tone: string;
}

export const capabilities: Capability[] = [
  {
    t: 'Training en IA',
    d: 'Formación en vivo que arranca por entender cómo piensa un modelo, no por memorizar prompts que funcionan hasta que dejan de funcionar.',
    span: 'span-3',
    tone: 'peri',
  },
  {
    t: 'Adopción de IA',
    d: 'Acompañamos a las personas que tienen que usarla en su trabajo real, hasta que deja de ser un experimento y se vuelve rutina.',
    span: 'span-3',
    tone: '',
  },
  {
    t: 'Cultura de IA',
    d: 'Lenguaje común y confianza para que el equipo pregunte en lugar de fingir que ya sabe.',
    span: 'span-2',
    tone: 'dark',
  },
  {
    t: 'Estrategia de aplicación',
    d: 'Dónde la IA rinde, dónde estorba y en qué orden conviene moverse. Decir que no también es parte del trabajo.',
    span: 'span-2',
    tone: 'teal',
  },
  {
    t: 'Uso seguro y ético',
    d: 'Qué se puede compartir con una IA, qué no, y cómo sostenerlo sin frenar a nadie.',
    span: 'span-2',
    tone: 'gold',
  },
];

/* --- Nuestro impacto ------------------------------------------------------ */

export const impact = {
  title: 'Nuestro impacto',
  copy: 'Trabajamos con personas, equipos y comunidades educativas que llegan sin saber por dónde empezar y salen usando IA en su día a día con criterio propio.',
  ctaLabel: 'Conoce a nuestros clientes',
};

/* --- Servicios ------------------------------------------------------------
   Each service also has its own page under /servicios/<slug>. */

export interface ServiceFaq {
  q: string;
  a: string;
}

export interface CapabilityGroup {
  t: string;
  items: string[];
  tone: string;
}

export interface Service {
  slug: string;
  name: string;
  audience: string;
  slogan: string;
  cardCopy: string;
  accent: string;
  span: string;
  tone: string;
  payback: {
    headline: string;
    cards: { t: string; d: string }[];
  };
  challenge: {
    headline: string;
    cards: { t: string; d: string }[];
  };
  capabilities: {
    headline: string;
    groups: CapabilityGroup[];
  };
  cta: { label: string; modal: '' | 'grow' | 'learn'; target: string };
  faqs: ServiceFaq[];
}

export const services: Service[] = [
  {
    slug: 'squai-one',
    name: 'Squai One',
    audience: 'Personas',
    slogan: 'Aprende IA sin que nadie te la tenga que traducir.',
    cardCopy:
      'Cohortes en vivo para personas que quieren entender la IA de una vez, no coleccionar tutoriales. Aquí vive la cohorte abierta.',
    accent: '#8A8EF9',
    span: 'span-3 row-2',
    tone: 'peri',
    payback: {
      headline: 'Criterio propio para usar cualquier herramienta de IA: la de hoy y la que salga mañana.',
      cards: [
        {
          t: 'Entiendes qué pasa por dentro',
          d: 'Sabes por qué la IA responde lo que responde. Dejas de adivinar y empiezas a pedir bien a la primera.',
        },
        {
          t: 'Trabajas sobre tus propios casos',
          d: 'Traes algo de tu día real y sales con eso resuelto o encaminado, no con apuntes para aplicar algún día.',
        },
        {
          t: 'No dependes de la app de moda',
          d: 'Aprendes la lógica que todas comparten. Cambia el nombre de la herramienta y tú sigues igual de suelto.',
        },
      ],
    },
    challenge: {
      headline: 'Nuestro desafío',
      cards: [
        {
          t: 'Empezar sin punto de partida',
          d: 'Ves a otras personas resolviendo su día con IA, pero cuando buscas cómo hacerlo te encuentras tecnicismos o promesas que no aterrizan en tu realidad.',
        },
        {
          t: 'Pedir y que no entienda',
          d: 'Le encargas una tarea y vuelve algo inservible. Terminas corrigiendo más de lo que habrías tardado haciéndolo tú.',
        },
        {
          t: 'Una herramienta nueva cada semana',
          d: 'La sensación de ir tarde no se arregla aprendiendo diez apps. Se arregla entendiendo qué tienen en común.',
        },
      ],
    },
    capabilities: {
      headline: 'Capacidades',
      groups: [
        {
          t: 'Entender.',
          tone: '',
          items: [
            'Cómo procesa un modelo lo que le escribes',
            'Tokens, memoria y contexto, en español',
            'Por qué se equivoca y cómo darte cuenta',
          ],
        },
        {
          t: 'Practicar.',
          tone: 'teal',
          items: [
            'Estructura de prompts que sí funcionan',
            'Documentos, análisis y apoyos visuales',
            'Flujos de trabajo y agentes',
          ],
        },
        {
          t: 'Ampliar.',
          tone: 'dark',
          items: [
            'Criterio para elegir herramienta según el problema',
            'Qué delegar y qué revisar siempre',
            'Tu propio caso, aterrizado con acompañamiento',
          ],
        },
      ],
    },
    cta: { label: 'Reservar mi lugar', modal: '', target: 'lista' },
    faqs: [
      {
        q: '¿Necesito conocimientos previos de tecnología?',
        a: 'No. Todo está diseñado desde cero para personas no técnicas. Explicamos los conceptos con claridad y enfocados en aplicarlos en tu día a día.',
      },
      {
        q: '¿Cuándo son las clases y cuánto duran?',
        a: 'Las sesiones en vivo son martes y jueves de 6:30 p.m. a 8:30 p.m. (hora Colombia), 4 horas semanales durante 5 semanas.',
      },
      {
        q: '¿Qué pasa si no puedo asistir a una clase en vivo?',
        a: 'Todas las sesiones se graban y quedan disponibles durante el programa para que te pongas al día o repases.',
      },
      {
        q: '¿Qué herramientas vamos a usar?',
        a: 'ChatGPT, Claude y Gemini, entre otras. Lo importante es la lógica detrás: con eso te adaptas a la que necesites.',
      },
      {
        q: '¿Qué necesito para participar?',
        a: 'Un computador con internet y una cuenta gratuita en las herramientas que usemos. Con las versiones gratis alcanza.',
      },
      {
        q: '¿Cómo entro a la próxima cohorte?',
        a: 'Los cupos se asignan desde la lista de espera. Déjanos tus datos y te escribimos apenas se abra la inscripción, con fechas confirmadas e información de pago.',
      },
    ],
  },
  {
    slug: 'squai-grow',
    name: 'Squai Grow',
    audience: 'Equipos y organizaciones',
    slogan: 'Que la IA entre a tus procesos sin desordenar lo que ya funciona.',
    cardCopy: 'Entrenamiento a la medida sobre los procesos que tu equipo ya tiene, no sobre ejemplos genéricos.',
    accent: '#44D4C8',
    span: 'span-3',
    tone: 'teal',
    payback: {
      headline: 'Un equipo que usa IA en su trabajo real, con reglas claras y sin frenar la operación.',
      cards: [
        {
          t: 'Casos de uso propios, no demos',
          d: 'Partimos de las tareas que ya ocupan las horas de tu equipo y sobre esas trabajamos.',
        },
        {
          t: 'Adopción que sobrevive al entusiasmo',
          d: 'Acompañamos a quienes tienen que usarla, no solo a quien firmó la decisión.',
        },
        {
          t: 'Reglas de uso que la gente entiende',
          d: 'Qué se comparte, qué se revisa y quién responde por qué, escrito en un lenguaje que cualquiera aplica.',
        },
      ],
    },
    challenge: {
      headline: 'Nuestro desafío',
      cards: [
        {
          t: 'Pilotos que nunca escalan',
          d: 'Una prueba entusiasta, un par de personas convencidas y seis meses después nada cambió en la operación.',
        },
        {
          t: 'Licencias compradas y sin usar',
          d: 'La herramienta ya está pagada. Lo que falta es que alguien explique para qué sirve en el trabajo concreto de cada área.',
        },
        {
          t: 'Un equipo partido en dos',
          d: 'Unos ya la usan a escondidas y sin criterio; otros no la tocan por miedo a equivocarse. Ninguno de los dos extremos es sostenible.',
        },
      ],
    },
    capabilities: {
      headline: 'Capacidades',
      groups: [
        {
          t: 'Diagnosticar.',
          tone: '',
          items: [
            'Mapeo de procesos y tareas candidatas',
            'Dónde rinde la IA y dónde no vale la pena',
            'Nivel real del equipo, sin encuestas de mentira',
          ],
        },
        {
          t: 'Formar.',
          tone: 'teal',
          items: [
            'Sesiones por área con sus propios casos',
            'Prompts y flujos armados con sus datos',
            'Materiales que quedan en la organización',
          ],
        },
        {
          t: 'Sostener.',
          tone: 'dark',
          items: [
            'Reglas de uso seguro y responsable',
            'Referentes internos que mantienen la práctica',
            'Seguimiento después de la formación',
          ],
        },
      ],
    },
    cta: { label: 'Agendar una llamada', modal: 'grow', target: '' },
    faqs: [
      {
        q: '¿Desde cuántas personas trabajan con un equipo?',
        a: 'Desde 5. También armamos rutas separadas cuando son varias áreas con necesidades distintas.',
      },
      {
        q: '¿El contenido es el mismo del programa abierto?',
        a: 'No. La metodología es la misma, el contenido no: partimos de un diagnóstico de sus procesos y armamos las sesiones sobre esos casos.',
      },
      {
        q: '¿Las sesiones son virtuales o presenciales?',
        a: 'Las dos. Virtual en vivo por defecto; presencial cuando el equipo está reunido y tiene sentido.',
      },
      {
        q: '¿Necesitamos comprar licencias antes de empezar?',
        a: 'No para empezar. Con las versiones gratuitas se cubre la formación, y parte del trabajo es ayudarles a decidir qué vale la pena pagar y qué no.',
      },
      {
        q: '¿Cómo saben si funcionó?',
        a: 'Definimos al inicio qué tareas queremos mover y con qué se compara. Sin eso, cualquier resultado suena bonito y no dice nada.',
      },
    ],
  },
  {
    slug: 'squai-learn',
    name: 'Squai Learn',
    audience: 'Comunidades educativas',
    slogan: 'Preparar a docentes y estudiantes para un aula que ya cambió.',
    cardCopy: 'Formación en IA para colegios, universidades y programas educativos, con criterio y uso responsable.',
    accent: '#F9C24D',
    span: 'span-3',
    tone: 'gold',
    payback: {
      headline: 'Docentes que enseñan con IA y estudiantes que la usan sin dejar de aprender.',
      cards: [
        {
          t: 'Docentes con criterio, no con miedo',
          d: 'Saben qué pueden delegar en la preparación de clase y qué tienen que seguir haciendo ellos.',
        },
        {
          t: 'Estudiantes que aprenden igual',
          d: 'Usan la herramienta para entender más rápido, no para entregar sin haber entendido nada.',
        },
        {
          t: 'Una postura institucional clara',
          d: 'Reglas que se pueden explicar en una reunión de padres y sostener en un consejo académico.',
        },
      ],
    },
    challenge: {
      headline: 'Nuestro desafío',
      cards: [
        {
          t: 'Prohibirla no funcionó',
          d: 'Los estudiantes ya la usan. La pregunta dejó de ser si entra al aula y pasó a ser cómo entra.',
        },
        {
          t: 'La integridad académica en juego',
          d: 'Evaluar lo mismo de siempre con una IA disponible cambia lo que la nota está midiendo.',
        },
        {
          t: 'Docentes sin tiempo para otra cosa',
          d: 'Cualquier propuesta que sume trabajo en vez de quitarlo se abandona en dos semanas.',
        },
      ],
    },
    capabilities: {
      headline: 'Capacidades',
      groups: [
        {
          t: 'Preparar.',
          tone: '',
          items: [
            'Diagnóstico del uso que ya existe en la institución',
            'Ruta para docentes y ruta para estudiantes',
            'Lenguaje común para toda la comunidad',
          ],
        },
        {
          t: 'Enseñar.',
          tone: 'gold',
          items: [
            'Fundamentos de IA sin tecnicismos',
            'IA aplicada a preparación de clase y evaluación',
            'Uso responsable y honestidad académica',
          ],
        },
        {
          t: 'Acompañar.',
          tone: 'dark',
          items: [
            'Lineamientos de uso para la institución',
            'Materiales para seguir usando después',
            'Acompañamiento a los equipos que lideran el cambio',
          ],
        },
      ],
    },
    cta: { label: 'Agendar una llamada', modal: 'learn', target: '' },
    faqs: [
      {
        q: '¿Trabajan con colegios o solo con universidades?',
        a: 'Con ambos, y también con programas de formación. Cambia el lenguaje y los ejemplos, no la metodología.',
      },
      {
        q: '¿La formación es para docentes o para estudiantes?',
        a: 'Las dos rutas existen y se pueden tomar por separado. Nuestra recomendación es empezar por docentes.',
      },
      {
        q: '¿Nos ayudan a definir la política de uso de IA?',
        a: 'Sí. Salimos con lineamientos escritos que la institución puede adoptar, no con recomendaciones generales.',
      },
      {
        q: '¿Enseñan a detectar textos hechos con IA?',
        a: 'Trabajamos el tema con honestidad: los detectores fallan en ambos sentidos. Es más sólido rediseñar la evaluación que apostarle a una herramienta que se equivoca.',
      },
      {
        q: '¿Cuánto dura una formación?',
        a: 'Depende del alcance. Armamos la propuesta después de un diagnóstico corto con el equipo que lidera el proceso.',
      },
    ],
  },
];

/* --- Origen --------------------------------------------------------------- */

export const originStory: string[] = [
  'Squai no nació de una teoría sobre el futuro del trabajo. Nació de acompañar, uno por uno, a quienes intentaban usar IA en su día a día y se estrellaban con lo mismo.',
  'En ese trabajo apareció un patrón difícil de ignorar: los que más sufrían no eran los que menos capacidad tenían, sino los que no venían del mundo técnico. Se topaban con explicaciones llenas de jerga que hacen parecer que la IA es cosa de expertos, cuando no tiene por qué serlo.',
  'Así que hicimos lo contrario. Quitamos la complejidad que no aportaba, conservamos lo que de verdad sirve en la práctica y armamos una forma de enseñar que empieza por entender, sigue por probar y termina en que cada persona descubra qué más puede hacer.',
  'Hoy esa misma metodología llega a personas, a equipos y a comunidades educativas. Cambia el contexto y la intensidad; no cambia la manera de enseñar.',
];

/* --- Equipo --------------------------------------------------------------- */

export interface Instructor {
  img: string;
  name: string;
  role: string;
  linkedin: string;
  aria: string;
}

export const instructors: Instructor[] = [
  {
    img: '/images/team1.webp',
    name: 'Laura Villada',
    role: 'Estratega de Adopción de IA, Co-fundadora de Squai',
    linkedin: 'https://www.linkedin.com/in/laura-villadaa/',
    aria: 'LinkedIn de Laura Villada',
  },
  {
    img: '/images/team2.webp',
    name: 'Sebastián Rico',
    role: 'Ingeniero de IA, Co-fundador de Squai',
    linkedin: 'https://www.linkedin.com/in/josesebastianricoleyton/',
    aria: 'LinkedIn de Sebastián Rico',
  },
];

export interface SquadMember {
  img: string;
  name: string;
  role: string;
  d: string;
}

export const squadGrid: SquadMember[] = [
  {
    img: '/images/team3.webp',
    name: 'Daniel Guzmán',
    role: 'Analista de Procesos de Negocio',
    d: 'Piensa en cómo integrar la IA sin desordenar lo que ya funciona en tus procesos.',
  },
  {
    img: '/images/team4.webp',
    name: 'Ana Lasso',
    role: 'Especialista en Gestión de Talento Humano',
    d: 'Se enfoca en cómo los equipos adoptan la IA en el día a día, más allá de la teoría.',
  },
  {
    img: '/images/team5.webp',
    name: 'Luis López',
    role: 'Analista de Datos',
    d: 'Se asegura de que uses la IA con información confiable y bien estructurada.',
  },
  {
    img: '/images/team6.webp',
    name: 'Carlos Gómez',
    role: 'Analista de Seguridad de la Información',
    d: 'Vela porque uses la IA sin exponer información sensible.',
  },
];

/* --- FAQ de la home ------------------------------------------------------- */

export interface Faq {
  q: string;
  a: string;
}

export const faqs: Faq[] = [
  {
    q: '¿Necesito saber de tecnología para trabajar con ustedes?',
    a: 'No. Todo lo que hacemos está pensado para personas y equipos que no vienen del mundo técnico. Explicamos los conceptos con claridad y enfocados en aplicarlos.',
  },
  {
    q: '¿Qué diferencia a Squai de un curso de IA cualquiera?',
    a: 'Que no empezamos por la herramienta de moda, sino por que entiendas cómo funciona. Y que tampoco te vendemos que la IA lo puede todo: también te decimos qué no conviene delegarle.',
  },
  {
    q: '¿Cuál de los tres servicios me sirve?',
    a: 'Squai One si aprendes por tu cuenta, Squai Grow si el que tiene que moverse es tu equipo, y Squai Learn si trabajas en una institución educativa. Cada uno tiene su página con el detalle.',
  },
  {
    q: '¿Las formaciones son virtuales o presenciales?',
    a: 'Las cohortes abiertas son 100% virtuales y en vivo, con grabaciones. Para equipos e instituciones trabajamos virtual o presencial, según convenga.',
  },
  {
    q: '¿Trabajan solo en Colombia?',
    a: 'Trabajamos en español con toda Latinoamérica. Las sesiones en vivo se coordinan en hora Colombia.',
  },
  {
    q: '¿Cómo empiezo?',
    a: 'Si es para ti, entra a Squai One y reserva tu lugar en la lista de espera. Si es para una organización o una institución, agenda una llamada desde la página del servicio y lo conversamos.',
  },
];

/* --- Síguenos ------------------------------------------------------------- */

export interface Social {
  name: string;
  href: string;
}

export const socials: Social[] = [
  { name: 'LinkedIn', href: '' },
  { name: 'Instagram', href: '' },
  { name: 'X', href: '' },
];

/* --- Footer --------------------------------------------------------------- */

export interface FooterLink {
  t: string;
  target: string | null;
  href?: string;
}

export interface FooterCol {
  h: string;
  links: FooterLink[];
}

export const footerCols: FooterCol[] = [
  {
    h: 'Squai',
    links: [
      { t: 'Qué hacemos', target: 'que-hacemos' },
      { t: 'Nuestro impacto', target: 'impacto' },
      { t: 'Cómo nació Squai', target: 'origen' },
      { t: 'El equipo', target: 'equipo' },
    ],
  },
  {
    h: 'Servicios',
    links: [
      { t: 'Squai One — Personas', target: null, href: '/servicios/squai-one' },
      { t: 'Squai Grow — Equipos', target: null, href: '/servicios/squai-grow' },
      { t: 'Squai Learn — Educación', target: null, href: '/servicios/squai-learn' },
    ],
  },
  {
    h: 'Contacto',
    links: [
      { t: 'team@squai.io', target: null, href: 'mailto:team@squai.io' },
      { t: 'Preguntas frecuentes', target: 'faq' },
    ],
  },
];

/* --- API ------------------------------------------------------------------ */

/*
 * Rutas relativas: el mismo Worker que sirve el sitio estático atiende /api/*,
 * así que no hay segundo origen ni CORS.
 * El modal de contacto comparte endpoint para Grow y Learn; el ecosistema viaja
 * en el campo `ecosystem` del cuerpo.
 */
export const endpoints = {
  waitlist: '/api/waitlist',
  grow: '/api/contact',
  learn: '/api/contact',
};
