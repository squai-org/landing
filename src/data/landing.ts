/* ---------------------------------------------------------------------------
   Site content.
   Copy here carries the brand: purpose, values and personality are expressed
   through how things are said, not listed as a "misión / visión" panel.
   Voice: humana, directa, juguetona, curiosa, sin humo.
--------------------------------------------------------------------------- */

export interface NavLink {
  label: string;
  target: string;
}

export const navLinks: NavLink[] = [
  { label: 'Ecosistemas', target: 'ecosistemas' },
  { label: 'Método', target: 'metodo' },
  { label: 'Cohorte abierta', target: 'cohorte' },
  { label: 'Equipo', target: 'equipo' },
  { label: 'Preguntas frecuentes', target: 'faq' },
];

/* --- Hero ---------------------------------------------------------------- */

export const tagline = 'Aprende IA, potencia tus habilidades.';

export const heroStatement = ['Aprende IA.', 'potencia tus habilidades.'];

export const heroSubtitle =
  'Squai enseña inteligencia artificial a personas, equipos y comunidades que no vienen de la tecnología. Sin jerga, sin humo y con las manos en la herramienta desde el primer día.';

/* --- Cohorte abierta ------------------------------------------------------
   Shown in the hero eyebrow and expanded in the #cohorte section. Update
   these five fields when a new cohort opens; nothing else needs to change. */

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

export const cohortMeta: string[] = [cohort.duration, 'Clases en vivo + grabaciones', 'Sin conocimientos previos'];

/* --- Dolor del cliente ---------------------------------------------------- */

export interface Pain {
  t: string;
  quote: string;
  d: string;
}

export const pains: Pain[] = [
  {
    t: 'El teléfono roto con la IA',
    quote: '"Le pido una tarea a la IA y me da un resultado inútil, nunca entiende lo que le pido."',
    d: 'Sabes que la herramienta puede ayudarte, pero cuando la usas para un documento, un análisis o una imagen terminas corrigiendo más de lo que hubieras tardado haciéndolo tú.',
  },
  {
    t: 'Abrumado por tantas opciones',
    quote: '"Todos los días sale algo nuevo sobre IA y siento que me estoy quedando atrás."',
    d: 'Parece que hay que aprender diez aplicaciones a la vez. El problema no es cada app nueva: es que nadie te explicó la lógica de fondo que todas comparten.',
  },
  {
    t: 'Sin un punto de partida claro',
    quote: '"Sé que la IA puede ahorrarme tiempo, pero no sé por dónde empezar."',
    d: 'Ves a otras personas resolviendo su día con IA, pero cuando buscas cómo hacerlo te encuentras tecnicismos o promesas que no aterrizan en tu realidad.',
  },
];

/* --- Manifiesto (propósito, sin decirlo con esa palabra) ------------------ */

export const manifesto = {
  statement: 'Nadie debería quedarse por fuera de la IA por no hablar el idioma de los técnicos.',
  body: [
    'La inteligencia artificial dejó de ser un tema de laboratorio y pasó a ser parte del trabajo, del estudio y de la vida diaria. Pero la mayoría de las explicaciones siguen escritas para quien ya entiende.',
    'Squai existe para cerrar esa distancia: hacer comprensible lo complejo sin escondernos detrás de tecnicismos, y llevar esa comprensión a personas, equipos, empresas e instituciones que quieren usar la IA con criterio propio.',
  ],
  note: 'Profesionales en lo que sabemos. Relajados en cómo lo contamos.',
};

/* --- Método: Entender → Experimentar → Ampliar ---------------------------- */

export interface MethodStep {
  n: string;
  t: string;
  quote: string;
  d: string;
  accent: string;
  ink: string;
}

export const methodSteps: MethodStep[] = [
  {
    n: '01',
    t: 'Entender',
    quote: '"Ahora sí entiendo."',
    d: 'Primero la comprensión. Qué es realmente un modelo, cómo procesa lo que le escribes y por qué a veces se equivoca. Sin analogías mágicas ni promesas de ciencia ficción.',
    accent: '#8A8EF9',
    ink: '#0A0C1A',
  },
  {
    n: '02',
    t: 'Experimentar',
    quote: '"Ahora sé cómo utilizarla."',
    d: 'Después la práctica. Trabajas con tus propios casos, en vivo, y sales de cada sesión con algo que ya probaste tú mismo, no con apuntes para aplicar algún día.',
    accent: '#44D4C8',
    ink: '#0A0C1A',
  },
  {
    n: '03',
    t: 'Ampliar',
    quote: '"Ahora veo más posibilidades de lo que puedo hacer."',
    d: 'Luego las posibilidades. Cuando entiendes la lógica y ya la usaste, empiezas a ver usos que nadie te enseñó. Esa parte no te la prometemos: la descubres.',
    accent: '#F9C24D',
    ink: '#0A0C1A',
  },
];

export const methodNote = 'Primero comprensión. Después práctica. Luego posibilidades.';

/* --- Ecosistemas: una metodología, diferentes contextos ------------------- */

export interface Ecosystem {
  id: 'one' | 'grow' | 'learn';
  name: string;
  tab: string;
  territory: string;
  audience: string;
  headline: string;
  copy: string;
  points: string[];
  ctaLabel: string;
  ctaTarget: string;
  ctaModal: '' | 'grow' | 'learn';
  accent: string;
}

export const ecosystems: Ecosystem[] = [
  {
    id: 'one',
    name: 'Squai One',
    tab: 'Squai One',
    territory: 'Aprender',
    audience: 'Personas',
    headline: 'Aprende IA sin depender de que alguien te la traduzca.',
    copy: 'Programas abiertos para personas que quieren empezar, ordenar lo que ya saben o dejar de usar la IA a punta de tutoriales sueltos. Se aprende en vivo, en grupo y con tus propios casos sobre la mesa.',
    points: [
      'Cohortes en vivo con cupos limitados',
      'Pensado para perfiles no técnicos',
      'Sales con una hoja de ruta para tu propio caso',
    ],
    ctaLabel: 'Ver la cohorte abierta',
    ctaTarget: 'cohorte',
    ctaModal: '',
    accent: '#8A8EF9',
  },
  {
    id: 'grow',
    name: 'Squai Grow',
    tab: 'Squai Grow',
    territory: 'Integrar',
    audience: 'Equipos y organizaciones',
    headline: 'Que la IA entre a tus procesos sin desordenar lo que ya funciona.',
    copy: 'Entrenamientos a la medida para equipos de 5, de 30 o para varias áreas a la vez. Partimos de los procesos que ustedes ya tienen y trabajamos sobre esos, no sobre ejemplos genéricos.',
    points: [
      'Diagnóstico previo de procesos y casos de uso',
      'Contenido armado con los datos y tareas del equipo',
      'Acompañamiento a quienes tienen que adoptarlo, no solo a quien lo aprueba',
    ],
    ctaLabel: 'Agendar una llamada',
    ctaTarget: '',
    ctaModal: 'grow',
    accent: '#44D4C8',
  },
  {
    id: 'learn',
    name: 'Squai Learn',
    tab: 'Squai Learn',
    territory: 'Preparar',
    audience: 'Comunidades educativas',
    headline: 'Preparar a estudiantes y docentes para un contexto que ya cambió.',
    copy: 'Formación en IA para colegios, universidades y programas educativos. Enfocada en criterio y uso responsable: qué delegar, qué revisar y cómo se sostiene la integridad académica.',
    points: [
      'Rutas separadas para docentes y estudiantes',
      'Criterio de uso responsable y honestidad académica',
      'Materiales para seguir usando después de la formación',
    ],
    ctaLabel: 'Agendar una llamada',
    ctaTarget: '',
    ctaModal: 'learn',
    accent: '#F9C24D',
  },
];

/* --- Cohorte: qué vas a lograr ------------------------------------------- */

export interface Outcome {
  bg: string;
  fg: string;
  n: string;
  t: string;
  d: string;
}

export const outcomes: Outcome[] = [
  { bg: '#8A8EF9', fg: '#0A0C1A', n: '1', t: 'Pedirle cosas a la IA y que entienda a la primera', d: 'Aprenderás a darle instrucciones claras para que te entregue respuestas útiles y precisas sin perder tiempo corrigiendo.' },
  { bg: '#44D4C8', fg: '#0A0C1A', n: '2', t: 'Usar cualquier IA sin depender de un tutorial', d: 'Entenderás cómo piensan estas herramientas para adaptarte fácilmente a la que necesites hoy o a la que aparezca mañana.' },
  { bg: '#F9C24D', fg: '#0A0C1A', n: '3', t: 'Saber qué delegarle a la IA y qué no', d: 'Identificarás cuándo usarla para una consulta rápida y cuándo apoyarte en ella para tareas más complejas o repetitivas.' },
  { bg: '#8A8EF9', fg: '#0A0C1A', n: '4', t: 'Apoyar tus tareas diarias en múltiples formatos', d: 'Descubrirás cómo usarla para redactar, analizar datos, crear apoyos visuales y agilizar diferentes actividades de tu día a día.' },
  { bg: '#44D4C8', fg: '#0A0C1A', n: '5', t: 'Tener una hoja de ruta clara para tu propia idea', d: 'Traerás un caso o necesidad de tu día a día y definirás la mejor forma de resolverlo con IA, contando con nuestra retroalimentación para aterrizarlo.' },
];

export interface Week {
  bt: string;
  n: string;
  t: string;
  d: string;
}

export const weeks: Week[] = [
  { bt: '0', n: '01', t: 'Bases de la IA', d: 'Comprende qué es la IA generativa, cómo procesa la información (tokens, memoria y contexto) y cómo estructurar prompts efectivos.' },
  { bt: '1px solid rgba(10,12,26,.08)', n: '02', t: 'Workflows y agentes', d: 'Entiende la diferencia entre pedirle una respuesta puntual a la IA y permitirle coordinar secuencias de tareas autónomas.' },
  { bt: '1px solid rgba(10,12,26,.08)', n: '03', t: 'Criterio de selección de herramientas', d: 'Un recorrido práctico por las principales soluciones de IA para saber cuál elegir según lo que quieras resolver.' },
  { bt: '1px solid rgba(10,12,26,.08)', n: '04', t: 'Aplicaciones prácticas', d: 'Aplica lo aprendido en tu día a día para agilizar la creación de documentos, reportes, presentaciones y apoyos visuales.' },
  { bt: '1px solid rgba(10,12,26,.08)', n: '05', t: 'Proyecto final aplicado', d: 'Define un caso de uso de tu propio contexto y aterriza una hoja de ruta funcional con el acompañamiento directo del equipo.' },
];

/* --- Origen y propósito de Squai ----------------------------------------- */

export const originStory: string[] = [
  'Squai no nació de una teoría sobre el futuro del trabajo. Nació de acompañar, uno por uno, a quienes intentaban usar IA en su día a día y se estrellaban con lo mismo.',
  'En ese trabajo apareció un patrón difícil de ignorar: los que más sufrían no eran los que menos capacidad tenían, sino los que no venían del mundo técnico. Se topaban con explicaciones llenas de jerga que hacen parecer que la IA es cosa de expertos, cuando no tiene por qué serlo.',
  'Así que hicimos lo contrario. Quitamos la complejidad que no aportaba, conservamos lo que de verdad sirve en la práctica y armamos una forma de enseñar que empieza por entender, sigue por probar y termina en que cada persona descubra qué más puede hacer.',
  'Hoy esa misma metodología llega a personas, a equipos y a comunidades educativas. Cambia el contexto y la intensidad; no cambia la manera de enseñar.',
];

export const originNote = 'Nunca impresionar antes que enseñar.';

/* --- Equipo --------------------------------------------------------------- */

export interface Instructor {
  img: string;
  name: string;
  role: string;
  linkedin: string;
  aria: string;
}

export const instructors: Instructor[] = [
  { img: '/images/team1.webp', name: 'Laura Villada', role: 'Estratega de Adopción de IA, Co-fundadora de Squai', linkedin: 'https://www.linkedin.com/in/laura-villadaa/', aria: 'LinkedIn de Laura Villada' },
  { img: '/images/team2.webp', name: 'Sebastián Rico', role: 'Ingeniero de IA, Co-fundador de Squai', linkedin: 'https://www.linkedin.com/in/josesebastianricoleyton/', aria: 'LinkedIn de Sebastián Rico' },
];

export interface SquadMember {
  img: string;
  name: string;
  role: string;
  d: string;
}

export const squadGrid: SquadMember[] = [
  { img: '/images/team3.webp', name: 'Daniel Guzmán', role: 'Analista de Procesos de Negocio', d: 'Piensa en cómo integrar la IA sin desordenar lo que ya funciona en tus procesos.' },
  { img: '/images/team4.webp', name: 'Ana Lasso', role: 'Especialista en Gestión de Talento Humano', d: 'Se enfoca en cómo los equipos adoptan la IA en el día a día, más allá de la teoría.' },
  { img: '/images/team5.webp', name: 'Luis López', role: 'Analista de Datos', d: 'Se asegura de que uses la IA con información confiable y bien estructurada.' },
  { img: '/images/team6.webp', name: 'Carlos Gómez', role: 'Analista de Seguridad de la Información', d: 'Vela porque uses la IA sin exponer información sensible.' },
];

/* --- Qué incluye el programa --------------------------------------------- */

export interface ProgramInclude {
  span: string;
  t: string;
  d: string;
}

export const programIncludes: ProgramInclude[] = [
  { span: 'span 3', t: 'Clases 100% en vivo', d: 'Sesiones interactivas donde aprenderás en directo con el equipo de Squai y podrás hacer preguntas al momento.' },
  { span: 'span 3', t: 'Acceso a las grabaciones', d: 'Si no puedes asistir a alguna clase en vivo o quieres repasar un tema, tendrás acceso a las grabaciones durante el programa.' },
  { span: 'span 2', t: 'Guía estratégica para tu proyecto', d: 'Acompañamiento durante las clases para estructurar cómo aplicar la IA a tu idea o caso de uso particular.' },
  { span: 'span 2', t: 'Comunidad para resolver dudas', d: 'Un espacio colectivo para hacer preguntas, aprender en grupo y compartir soluciones junto a nosotros y tus compañeros.' },
  { span: 'span 2', t: 'Plantillas y recursos prácticos', d: 'Guías rápidas, estructuras de prompts y recursos listos para apoyarte en tus tareas cotidianas.' },
];

export const includes: string[] = [
  'Clases 100% en vivo (martes y jueves, 6:30 p.m. a 8:30 p.m. hora Colombia)',
  'Acceso a las grabaciones durante el programa',
  'Guía estratégica para tu proyecto',
  'Comunidad para resolver dudas',
  'Certificado al finalizar el programa',
];

/* --- FAQ ------------------------------------------------------------------ */

export interface Faq {
  q: string;
  a: string;
}

export const faqs: Faq[] = [
  { q: '¿Necesito conocimientos previos de tecnología?', a: 'No, para nada. Todo lo que hacemos está diseñado desde cero pensando en personas no técnicas. Explicamos los conceptos con claridad, sin rodeos y enfocados en la aplicación práctica en tu día a día.' },
  { q: '¿Qué diferencia a Squai de un curso de IA cualquiera?', a: 'Que no empezamos por la herramienta de moda. Empezamos porque entiendas cómo funciona la IA, para que después puedas usar la que quieras y adaptarte a la que salga mañana. Y no te vendemos que la IA lo puede todo: también te decimos qué no conviene delegarle.' },
  { q: '¿Qué pasa si no puedo asistir a una clase en vivo?', a: 'No te preocupes. Todas las sesiones se graban y se suben al espacio del programa para que puedas ponerte al día o repasar el contenido cuando lo necesites.' },
  { q: '¿Cuándo son las clases en vivo y cuánto duran?', a: 'Las sesiones en vivo son los martes y jueves de 6:30 p.m. a 8:30 p.m. (hora Colombia), completando 4 horas semanales de aprendizaje interactivo en directo a lo largo de 5 semanas.' },
  { q: '¿Qué herramientas vamos a utilizar?', a: 'Trabajaremos con las herramientas líderes del mercado como ChatGPT, Claude y Gemini, entre otras. Lo más importante es que aprenderás la lógica detrás de ellas para adaptarte a la que necesites.' },
  { q: '¿Qué necesito para tomar el programa?', a: 'Solo necesitas un computador con conexión a internet y crear una cuenta gratuita en las herramientas que iremos usando durante las clases. Con la versión gratis de cada una es más que suficiente.' },
  { q: '¿Hacen formaciones para empresas o instituciones educativas?', a: 'Sí. Squai Grow trabaja con equipos y organizaciones sobre sus propios procesos, y Squai Learn con colegios, universidades y programas educativos. En ambos casos partimos de un diagnóstico y armamos el contenido a la medida: agenda una llamada y lo conversamos.' },
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
      { t: 'Ecosistemas', target: 'ecosistemas' },
      { t: 'Método', target: 'metodo' },
      { t: 'Cómo nació Squai', target: 'origen' },
      { t: 'El equipo', target: 'equipo' },
    ],
  },
  {
    h: 'Ecosistemas',
    links: [
      { t: 'Squai One — Personas', target: 'ecosistemas' },
      { t: 'Squai Grow — Equipos', target: 'ecosistemas' },
      { t: 'Squai Learn — Educación', target: 'ecosistemas' },
      { t: 'Cohorte abierta', target: 'cohorte' },
    ],
  },
  {
    h: 'Contacto',
    links: [
      { t: 'team@squai.io', target: null, href: 'mailto:team@squai.io' },
      { t: 'LinkedIn', target: null, href: 'https://www.linkedin.com/company/squai' },
      { t: 'Preguntas frecuentes', target: 'faq' },
    ],
  },
];

/* --- API ------------------------------------------------------------------
   The site is static (Cloudflare); forms post straight to the backend. */

const API_BASE = 'http://api-squai.io/api';

export const endpoints = {
  waitlist: `${API_BASE}/one/waitlist/1/`,
  grow: `${API_BASE}/grow/client/`,
  learn: `${API_BASE}/learn/client/`,
};
