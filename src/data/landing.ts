export interface NavLink {
  label: string;
  target: string;
}

export const navLinks: NavLink[] = [
  { label: 'El programa', target: 'programa' },
  { label: 'Instructores', target: 'instructores' },
  { label: 'Inversión', target: 'precio' },
  { label: 'Preguntas frecuentes', target: 'faq' },
];

export const logistics: string[] = [
  '🕒 Duración: 5 semanas (20 horas)',
  '🗓 Clases en vivo: Martes y jueves, 6:30 p. m. a 8:30 p. m. (Hora Colombia)',
  '💻 Modalidad: 100% Virtual con grabaciones y comunidad de acompañamiento',
];

export interface Outcome {
  bg: string;
  fg: string;
  n: string;
  t: string;
  d: string;
}

export const outcomes: Outcome[] = [
  { bg: '#7C8CFF', fg: '#FFFFFF', n: '1', t: 'Pedirle cosas a la IA y que entienda a la primera', d: 'Aprenderás a darle instrucciones claras para que te entregue respuestas útiles y precisas sin perder tiempo corrigiendo.' },
  { bg: '#44D4C8', fg: '#0D1B2A', n: '2', t: 'Usar cualquier IA sin depender de un tutorial', d: 'Entenderás cómo piensan estas herramientas para adaptarte fácilmente a la que necesites hoy o a la que aparezca mañana.' },
  { bg: '#F2C94C', fg: '#0D1B2A', n: '3', t: 'Saber qué delegarle a la IA y qué no', d: 'Identificarás cuándo usarla para una consulta rápida y cuándo apoyarte en ella para tareas más complejas o repetitivas.' },
  { bg: '#5568EE', fg: '#FFFFFF', n: '4', t: 'Apoyar tus tareas diarias en múltiples formatos', d: 'Descubrirás cómo usarla para redactar, analizar datos, crear apoyos visuales y agilizar diferentes actividades de tu día a día.' },
  { bg: '#44D4C8', fg: '#0D1B2A', n: '5', t: 'Tener una hoja de ruta clara para tu propia idea', d: 'Traerás un caso o necesidad de tu día a día y definirás la mejor forma de resolverlo con IA, contando con nuestra retroalimentación para aterrizarlo.' },
];

export interface Week {
  bt: string;
  n: string;
  t: string;
  d: string;
}

export const weeks: Week[] = [
  { bt: '0', n: '01', t: 'Bases de la IA', d: 'Comprende qué es la IA generativa, cómo procesa la información (tokens, memoria y contexto) y cómo estructurar prompts efectivos.' },
  { bt: '1px solid rgba(13,27,42,.08)', n: '02', t: 'Workflows y agentes', d: 'Entiende la diferencia entre pedirle una respuesta puntual a la IA y permitirle coordinar secuencias de tareas autónomas.' },
  { bt: '1px solid rgba(13,27,42,.08)', n: '03', t: 'Criterio de selección de herramientas', d: 'Un recorrido práctico por las principales soluciones de IA para saber cuál elegir según lo que quieras resolver.' },
  { bt: '1px solid rgba(13,27,42,.08)', n: '04', t: 'Aplicaciones prácticas', d: 'Aplica lo aprendido en tu día a día para agilizar la creación de documentos, reportes, presentaciones y apoyos visuales.' },
  { bt: '1px solid rgba(13,27,42,.08)', n: '05', t: 'Proyecto final aplicado', d: 'Define un caso de uso de tu propio contexto y aterriza una hoja de ruta funcional con el acompañamiento directo del equipo.' },
];

export const originStory: string[] = [
  'Este curso no salió de teorías abstractas ni de repetir lo que ya circula en internet. Nació de nuestro trabajo diario en tecnología desde Squai, acompañando a diferentes personas en su camino por aprender a usar IA.',
  'En este proceso notamos un patrón claro: quienes más sufrían eran las personas con perfiles no técnicos. Muchas veces se encontraban con explicaciones llenas de jerga compleja y conceptos enredados que hacen parecer que usar IA es algo exclusivo para expertos, cuando en realidad no tiene por qué ser así.',
  'Al ver de cerca esas trabas en entornos laborales cotidianos, en Squai reunimos lo que de verdad sirve en la práctica. Eliminamos la complejidad innecesaria y estructuramos este programa: una guía clara, directa y pensada para que cualquier persona tome el control de la IA sin sentirse abrumada.',
];

export interface Instructor {
  img: string;
  name: string;
  role: string;
  linkedin: string;
  aria: string;
}

export const instructors: Instructor[] = [
  { img: '/images/team1.webp', name: 'Laura Villada', role: 'Estratega de Adopción de IA, Co-fundadora de Squai', linkedin: 'https://www.linkedin.com/', aria: 'LinkedIn de Laura Villada' },
  { img: '/images/team2.webp', name: 'Sebastián Rico', role: 'Ingeniero de IA, Co-fundador de Squai', linkedin: 'https://www.linkedin.com/', aria: 'LinkedIn de Sebastián Rico' },
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

export interface Faq {
  q: string;
  a: string;
}

export const faqs: Faq[] = [
  { q: '¿Necesito conocimientos previos de tecnología?', a: 'No, para nada. Este programa está diseñado desde cero pensando en personas no técnicas. Explicamos los conceptos con claridad, sin rodeos y enfocados en la aplicación práctica en tu día a día.' },
  { q: '¿Qué pasa si no puedo asistir a una clase en vivo?', a: 'No te preocupes. Todas las sesiones se graban y se suben al espacio del programa para que puedas ponerte al día o repasar el contenido cuando lo necesites.' },
  { q: '¿Cuándo son las clases en vivo y cuánto duran?', a: 'Las sesiones en vivo son los martes y jueves de 6:30 p.m. a 8:30 p.m. (hora Colombia), completando 4 horas semanales de aprendizaje interactivo en directo a lo largo de 5 semanas.' },
  { q: '¿Qué herramientas vamos a utilizar?', a: 'Trabajaremos con las herramientas líderes del mercado como ChatGPT, Claude y Gemini, entre otras. Lo más importante es que aprenderás la lógica detrás de ellas para adaptarte a la que necesites.' },
  { q: '¿Qué necesito para tomar el programa?', a: 'Solo necesitas un computador con conexión a internet y crear una cuenta gratuita en las herramientas que iremos usando durante las clases. Con la versión gratis de cada una es más que suficiente para realizar el programa.' },
];

export interface FooterLink {
  t: string;
  target: string | null;
}

export interface FooterCol {
  h: string;
  links: FooterLink[];
}

export const footerCols: FooterCol[] = [
  {
    h: 'El programa',
    links: [
      { t: 'El programa paso a paso', target: 'programa' },
      { t: 'Instructores', target: 'instructores' },
      { t: 'Inversión', target: 'precio' },
      { t: 'Preguntas frecuentes', target: 'faq' },
    ],
  },
  {
    h: 'Squai',
    links: [
      { t: 'Squai Grow — Empresas', target: 'organizaciones' },
      { t: 'Squai Learn — Instituciones', target: 'organizaciones' },
      { t: 'El equipo Squai', target: 'equipo' },
    ],
  },
  {
    h: 'Contacto',
    links: [
      { t: 'team@squai.io', target: null },
      { t: 'LinkedIn', target: null },
    ],
  },
];
