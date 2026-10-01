import { Topic } from './types';

// Temario adaptado a 3º ESO (Nivel A2+/B1)
// Reemplaza completamente el temario de 2º de la ESO
export const INITIAL_TOPICS_3ESO: Topic[] = [
  {
    id: 'unit1_perfect_simple',
    unitCode: 'Unit 1 • 3º ESO',
    title: 'Present Perfect vs. Past Simple',
    description: 'Experiencias de vida, acciones pasadas y marcadores temporales (already, yet, just, for, since, ever, never).',
    icon: 'Calendar',
    color: 'bg-indigo-600',
    systemPromptContext: `
      Nivel: 3º ESO (14-15 años, A2+/B1).
      Gramática:
      1. Present Perfect Simple: have/has + past participle. Para acciones conectadas con el presente, experiencias de vida sin momento concreto.
      2. Past Simple: -ed / verbos irregulares. Para momentos concretos del pasado (yesterday, in 2022, last week, ago).
      3. Marcadores temporales clave:
         - ALREADY: Afirmativas entre have y participio ("I have already done my homework").
         - YET: Negativas e interrogativas al final de frase ("Has he arrived yet? / I haven't finished yet").
         - JUST: Acciones muy recientes ("She has just left").
         - FOR: Periodos de tiempo ("for three years").
         - SINCE: Puntos concretos de inicio ("since Monday, since 2020").
         - EVER / NEVER: Preguntas ("Have you ever...?") y experiencias negativas ("I have never seen that").
      Vocabulario 3º ESO: Viajes, experiencias, logros y expresiones temporales.
    `,
    sampleKeywords: ['Present Perfect', 'Past Simple', 'For / Since', 'Already / Yet', 'Irregular Verbs']
  },
  {
    id: 'unit2_past_narrative',
    unitCode: 'Unit 2 • 3º ESO',
    title: 'Narrative Tenses & "Used to"',
    description: 'Past Continuous vs. Past Simple (when/while), hábitos del pasado con "Used to" y biografías.',
    icon: 'CloudLightning',
    color: 'bg-blue-600',
    systemPromptContext: `
      Nivel: 3º ESO (14-15 años, A2+/B1).
      Gramática:
      1. Past Continuous (was/were + verb-ing): Acción en progreso en el pasado.
      2. Past Simple: Acción puntual que interrumpe o secuencia de eventos ("I was walking when it started to rain").
      3. Conectores: WHILE + Past Continuous ("While I was cooking..."), WHEN + Past Simple ("...when the phone rang").
      4. USED TO + Infinitivo: Hábitos o estados del pasado que ya no ocurren ("I used to live in Valencia", "Did you use to play tennis?").
      Vocabulario 3º ESO: Sentimientos, accidentes, anécdotas y biografía personal.
    `,
    sampleKeywords: ['Past Continuous', 'When / While', 'Used to', 'Past Habits', 'Interrupted Actions']
  },
  {
    id: 'unit3_modals_deduction',
    unitCode: 'Unit 3 • 3º ESO',
    title: 'Modals of Deduction & Obligation',
    description: 'Certeza y deducción (must, can\'t, might/could) y matices de obligación (must, have to, should, needn\'t).',
    icon: 'AlertCircle',
    color: 'bg-purple-600',
    systemPromptContext: `
      Nivel: 3º ESO (14-15 años, A2+/B1).
      Gramática:
      1. Deducción en presente:
         - MUST be: 100% seguro de que sí ("He has a luxury car; he must be rich").
         - CAN'T be: 100% seguro de que no / imposible ("That can't be true, she is in Paris").
         - MIGHT / COULD be: Posible pero no seguro ("It might rain later").
      2. Obligación y consejo:
         - MUST / HAVE TO: Obligación fuerte (Must = interna / Have to = externa/reglas).
         - DON'T HAVE TO / NEEDN'T: Falta de obligación ("No hace falta").
         - MUSTN'T: Prohibición estricta ("You mustn't smoke here").
         - SHOULD / OUGHT TO: Consejo o recomendación.
      Vocabulario 3º ESO: Normas escolares, misterios, deportes y profesiones.
    `,
    sampleKeywords: ['Must be / Can\'t be', 'Might / Could', 'Have to / Must', 'Needn\'t / Don\'t have to', 'Should']
  },
  {
    id: 'unit4_passive_relatives',
    unitCode: 'Unit 4 • 3º ESO',
    title: 'The Passive Voice & Relative Clauses',
    description: 'Voz pasiva (Present & Past Simple: is/are done, was/were built) y pronombres relativos (who, which, that, where, whose).',
    icon: 'TreeDeciduous',
    color: 'bg-emerald-600',
    systemPromptContext: `
      Nivel: 3º ESO (14-15 años, A2+/B1).
      Gramática:
      1. Voz Pasiva en Present Simple: am/is/are + Past Participle ("English is spoken worldwide").
      2. Voz Pasiva en Past Simple: was/were + Past Participle ("The Colosseum was built by the Romans").
      3. Agente con 'by' solo cuando aporta información relevante.
      4. Oraciones de relativo (Defining Relative Clauses):
         - WHO / THAT: Personas ("The teacher who helped me").
         - WHICH / THAT: Cosas o animales ("The book which I read").
         - WHERE: Lugares ("The city where I was born").
         - WHOSE: Posesión ("The boy whose dog ran away").
      Vocabulario 3º ESO: Inventos, tecnología, descubrimientos históricos y descripciones de personas y lugares.
    `,
    sampleKeywords: ['Passive Voice', 'Was / Were + Participle', 'Relative Pronouns', 'Who / Which / Where', 'Sentence Rewriting']
  }
];

export const STORAGE_KEYS = {
  TOPICS_3ESO: 'english_quest_3eso_topics',
  TOTAL_XP: 'english_quest_3eso_total_xp',
  COMPLETED_STATS: 'english_quest_3eso_stats',
  UPLOADED_PAGES: 'english_quest_3eso_uploaded_pages',
};
