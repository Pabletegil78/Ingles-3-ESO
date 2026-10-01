import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Question, QuestionType, TheoryContent, Topic } from "../types";

// Obtención segura de instancia de Gemini
let cachedAi: GoogleGenAI | null = null;
const getAi = (): GoogleGenAI | null => {
  if (cachedAi) return cachedAi;
  try {
    const key = process.env.API_KEY || (typeof window !== 'undefined' ? (window as unknown as { GEMINI_API_KEY?: string }).GEMINI_API_KEY : "") || "";
    cachedAi = new GoogleGenAI({ apiKey: key });
    return cachedAi;
  } catch (err) {
    console.warn("Could not create GoogleGenAI instance:", err);
    return null;
  }
};

const questionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    text: { 
      type: Type.STRING, 
      description: "Sentence with a _______ blank for fill_blank or multiple_choice. Or instructions for sentence_transformation." 
    },
    type: { 
      type: Type.STRING, 
      enum: [QuestionType.MULTIPLE_CHOICE, QuestionType.FILL_BLANK, QuestionType.SENTENCE_TRANSFORMATION] 
    },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "4 options for multiple choice questions. Null or empty if fill_blank or sentence_transformation.",
    },
    correctAnswer: { type: Type.STRING, description: "The correct target answer (word, short phrase, or transformed sentence)." },
    acceptableAnswers: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Alternative valid variations (e.g. contractions vs full form like 'haven't' / 'have not')."
    },
    originalSentence: {
      type: Type.STRING,
      description: "For sentence_transformation only: The original starting sentence. Null for other types."
    },
    keyWord: {
      type: Type.STRING,
      description: "For sentence_transformation only: The mandatory keyword (e.g. 'SINCE', 'USED', 'WAS', 'ALREADY')."
    },
    difficulty: {
      type: Type.INTEGER,
      description: "Difficulty score from 0 to 10 matching the requested complexity level."
    },
    hint: {
      type: Type.STRING,
      description: "Short pedagogical clue or grammatical hint in Spanish."
    },
    explanation: { 
      type: Type.STRING, 
      description: "Clear pedagogical explanation in SPANISH explaining why the answer is correct, citing the 3º ESO grammar rule and showing an English example." 
    },
  },
  required: ["id", "text", "type", "correctAnswer", "explanation"],
};

const questionsResponseSchema: Schema = {
  type: Type.ARRAY,
  items: questionSchema,
};

const theorySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    summarySpanish: { type: Type.STRING, description: "Resumen ejecutivo en español para el estudiante de 3º ESO" },
    htmlContent: { type: Type.STRING, description: "HTML enriquecido con Tailwind para la ficha teórica visual con tablas y pro-tips." },
    rules: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          explanation: { type: Type.STRING },
          example: { type: Type.STRING }
        },
        required: ["title", "explanation", "example"]
      }
    }
  },
  required: ["title", "htmlContent"]
};

export interface DifficultyInfo {
  level: number;
  label: string;
  tag: string;
  description: string;
  colorName: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const getDifficultyInfo = (level: number = 5): DifficultyInfo => {
  const clamped = Math.max(0, Math.min(10, Math.round(level)));
  if (clamped <= 2) {
    return {
      level: clamped,
      label: "Principiante / Guiado",
      tag: `Nivel ${clamped}`,
      description: "Frases cortas, pistas evidentes y vocabulario elemental sin trampas.",
      colorName: "emerald",
      badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      badgeText: "text-emerald-700",
      badgeBorder: "border-emerald-300",
    };
  } else if (clamped <= 4) {
    return {
      level: clamped,
      label: "Básico 3º ESO",
      tag: `Nivel ${clamped}`,
      description: "Estructuras directas del currículo de 3º ESO con marcadores claros.",
      colorName: "teal",
      badgeBg: "bg-teal-50 text-teal-700 border-teal-200",
      badgeText: "text-teal-700",
      badgeBorder: "border-teal-300",
    };
  } else if (clamped === 5) {
    return {
      level: clamped,
      label: "Estándar 3º ESO (Examen Oficial)",
      tag: `Nivel 5 (Actual)`,
      description: "Nivel de examen habitual en institutos de España (14-15 años, A2+/B1).",
      colorName: "indigo",
      badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
      badgeText: "text-indigo-700",
      badgeBorder: "border-indigo-300",
    };
  } else if (clamped <= 7) {
    return {
      level: clamped,
      label: "Desafío Exigente",
      tag: `Nivel ${clamped}`,
      description: "Oraciones compuestas, tiempos contrastados y distractores sutiles.",
      colorName: "amber",
      badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
      badgeText: "text-amber-700",
      badgeBorder: "border-amber-300",
    };
  } else if (clamped <= 9) {
    return {
      level: clamped,
      label: "Sobresaliente / B1",
      tag: `Nivel ${clamped}`,
      description: "Preguntas trampa habituales de 10, reescrituras complejas y precisión ortográfica.",
      colorName: "orange",
      badgeBg: "bg-orange-50 text-orange-700 border-orange-200",
      badgeText: "text-orange-700",
      badgeBorder: "border-orange-300",
    };
  } else {
    return {
      level: clamped,
      label: "Máximo Reto B1+ / Pre-B2",
      tag: "Nivel 10",
      description: "Estructuras de alta dificultad, vocabulario avanzado y transformaciones complejas.",
      colorName: "rose",
      badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
      badgeText: "text-rose-700",
      badgeBorder: "border-rose-300",
    };
  }
};

export const getDifficultyPromptInstructions = (level: number = 5): string => {
  const clamped = Math.max(0, Math.min(10, Math.round(level)));
  if (clamped <= 2) {
    return `NIVEL DE COMPLEJIDAD ${clamped}/10 (MÍNIMO / GUIADO):
    - Frases muy cortas (máximo 6-8 palabras) y vocabulario muy cotidiano y transparente.
    - Pistas súper evidentes que indican la regla sin ambigüedad.
    - En 'multiple_choice': 3 opciones incorrectas (distractores) muy fáciles de descartar.
    - En 'fill_blank': únicamente pedir rellenar una palabra básica (ej: 'is', 'was', 'have', 'did').
    - Explicaciones pedagógicas en español muy claras, cariñosas y paso a paso.`;
  }
  if (clamped <= 4) {
    return `NIVEL DE COMPLEJIDAD ${clamped}/10 (BÁSICO 3º ESO):
    - Estructuras gramaticales directas del currículo oficial de 3º ESO sin cláusulas subordinadas enrevesadas.
    - Marcadores de tiempo claros y explícitos (ej: 'yesterday', 'already', 'every Saturday', 'right now').
    - Distractores sencillos que refuerzan los conceptos esenciales.`;
  }
  if (clamped === 5) {
    return `NIVEL DE COMPLEJIDAD 5/10 (ESTÁNDAR EXAMEN 3º ESO - NIVEL BASE DE REFERENCIA):
    - Nivel oficial de examen habitual en institutos de secundaria de España para alumnos de 14-15 años (A2+/B1).
    - Frases realistas con vocabulario de adolescentes (colegio, aficiones, tecnología, amistades).
    - Distractores realistas basados en los errores típicos de examen (ej: olvidar la -s en 3ª persona, confundir for/since, participios irregulares habituales como 'written', 'bought', 'seen').
    - Ejercicios de reescritura de oraciones clásicos de secundaria.`;
  }
  if (clamped <= 7) {
    return `NIVEL DE COMPLEJIDAD ${clamped}/10 (DESAFÍO EXIGENTE 3º ESO):
    - Oraciones compuestas con dos cláusulas y conectores (while, although, as soon as, so that, unless).
    - Combinación de tiempos verbales contrastados en la misma oración (ej: Past Simple vs Past Continuous, Present Perfect vs Past Simple).
    - Distractores convincentes que exigen fijarse atentamente en la concordancia de sujeto y en la ortografía.`;
  }
  if (clamped <= 9) {
    return `NIVEL DE COMPLEJIDAD ${clamped}/10 (SOBRESALIENTE / CAMBRIDGE B1 PRELIMINARY):
    - Preguntas tipo trampa que discriminan la máxima nota (ej: verbos con dos complementos en pasiva, 'used to' vs 'be used to', modales de deducción, phrasal verbs frecuentes en 3º ESO).
    - Reescrituras complejas con palabras clave que obligan a reorganizar la estructura sintáctica completa manteniendo el significado idéntico.
    - Vocabulario más rico y matizado. Rigurosa ortografía y spelling.`;
  }
  return `NIVEL DE COMPLEJIDAD 10/10 (MÁXIMO RETO B1+ / PRE-B2):
  - Máxima exigencia gramatical: inversiones, condicionales con 'provided that / unless / in case', modales perfectos ('must have done / couldn't have been'), pasivas impersonales o estructuras causativas ('have something done').
  - Frases extensas y vocabulario sofisticado de nivel B1+/B2.
  - Distractores con sutiles matices gramaticales y de registro.`;
};

// Generación de preguntas para 3º ESO con tipología equilibrada y dificultad ajustable
export const generateQuestions = async (
  topicId: string, 
  count: number = 5, 
  allTopics: Topic[] = [],
  difficultyLevel: number = 5
): Promise<Question[]> => {
  let promptContext = "";
  const isExam = topicId === 'exam';
  const clampedDifficulty = Math.max(0, Math.min(10, Math.round(difficultyLevel)));

  if (isExam) {
    promptContext = `EXAMEN GLOBAL DE INGLÉS 3º ESO (Temario integrado de secundaria). Temario: ${allTopics.map(t => `${t.title} (${t.description})`).join('; ')}`;
  } else {
    const topic = allTopics.find(t => t.id === topicId);
    promptContext = topic ? `${topic.title}: ${topic.systemPromptContext}` : "English Grammar 3º ESO";
  }

  const prompt = `
    Eres un profesor especialista de inglés preparando un examen para 3º de la ESO (alumnos de 14-15 años).
    Genera exactamente ${count} ejercicios rigurosos y pedagógicos.
    
    Contexto curricular:
    ${promptContext}

    PARÁMETRO CRUCIAL DE DIFICULTAD:
    Nivel seleccionado: ${clampedDifficulty} de 10 (donde 5 es el estándar habitual de 3º ESO, 0 es el mínimo guiado y 10 es el máximo reto B1+).
    
    INSTRUCCIONES DE DIFICULTAD (${clampedDifficulty}/10):
    ${getDifficultyPromptInstructions(clampedDifficulty)}

    REGLAS ESTRICTAS DE CONTENIDO Y FORMATO:
    1. TIPOLOGÍA EQUILIBRADA (incluye variedad en los ${count} ejercicios):
       - 'multiple_choice': Pregunta con 4 opciones bien diferenciadas.
       - 'fill_blank': Frase con '_______' para completar con la forma verbal o partícula correcta.
       - 'sentence_transformation': Ejercicio de reescritura de oraciones (muy habitual en 3º ESO). Proporciona 'originalSentence' (la frase base), 'keyWord' (palabra clave en mayúsculas) y 'text' (la frase con hueco que el alumno debe completar con entre 2 y 5 palabras usando la palabra clave).
    2. IDIOMA:
       - Enunciados y frases en INGLÉS auténtico y natural adecuado al nivel ${clampedDifficulty}/10.
       - Explicaciones pedagógicas detalladas en ESPAÑOL ('explanation'), explicando la regla gramatical exacta y trucos para no fallar en el examen.
       - Pista ('hint') breve en español para cuando el alumno necesite apoyo.
    3. VARIACIONES:
       - En 'acceptableAnswers', incluye contracciones equivalentes (ej: "hasn't arrived", "has not arrived").
    4. En cada objeto retornado, establece el campo 'difficulty': ${clampedDifficulty}.
  `;

  try {
    const client = getAi();
    if (!client) {
      return getFallbackQuestions(topicId, count).map(q => ({ ...q, difficulty: clampedDifficulty }));
    }

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: questionsResponseSchema,
      },
    });

    const parsed = JSON.parse(response.text || "[]") as Question[];
    if (parsed.length > 0) {
      return parsed.map(q => ({
        ...q,
        difficulty: typeof q.difficulty === 'number' ? q.difficulty : clampedDifficulty
      }));
    }
    return getFallbackQuestions(topicId, count).map(q => ({ ...q, difficulty: clampedDifficulty }));
  } catch (error) {
    console.error("Error generating questions with Gemini:", error);
    return getFallbackQuestions(topicId, count).map(q => ({ ...q, difficulty: clampedDifficulty }));
  }
};

// Generación de fichas teóricas visuales
export const generateTheory = async (topicId: string, allTopics: Topic[] = []): Promise<TheoryContent> => {
  const topic = allTopics.find(t => t.id === topicId);
  const context = topic ? topic.systemPromptContext : "Gramática de 3º ESO";

  const prompt = `
    Crea una ficha teórica visual de repaso rápido ("Cheat Sheet" de alta efectividad) para un examen de 3º de ESO.
    Tema: ${topic ? topic.title : '3º ESO English'}
    Detalles: ${context}

    Estructura requerida para 'htmlContent':
    - Estilo Tailwind moderno, tarjetas limpias, sin tipografía gigante innecesaria.
    - Cajas con reglas gramaticales clave en inglés con su traducción o truco mental en español.
    - Tablas o listas de contraste (ej: Past Simple vs Present Perfect, marcadores for/since/already/yet, o estructura de la voz pasiva).
    - Sección destacada '¡Ojo con los fallos típicos del examen!' con ejemplos de qué NO poner.
    - Estilo de tarjeta: 'bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6'
    - Textos claros, colores serenos (azul pizarra, índigo para palabras clave, verde para ejemplos correctos, rojo para errores típicos).
  `;

  try {
    const client = getAi();
    if (!client) {
      return getFallbackTheory(topic);
    }

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: theorySchema,
      },
    });

    const parsed = JSON.parse(response.text || "{}") as TheoryContent;
    if (parsed.htmlContent) {
      return parsed;
    }
    return getFallbackTheory(topic);
  } catch (error) {
    console.error("Error generating theory with Gemini:", error);
    return getFallbackTheory(topic);
  }
};

// Análisis multimodal de fotos de páginas de libros o apuntes
export interface AnalyzedPageResult {
  detectedUnits: {
    unitTitle: string;
    description: string;
    grammarPoints: string[];
    vocabulary: string[];
    summaryNotesSpanish: string;
  }[];
  sampleExtractedExercises: Question[];
  recommendedTheoryCheatSheetHtml: string;
}

export const analyzePagesWithGemini = async (
  pages: { base64Data: string; mimeType: string; name: string }[]
): Promise<AnalyzedPageResult> => {
  if (pages.length === 0) {
    throw new Error("No pages provided for analysis");
  }

  // Preparar partes multimodales
  const contentsParts: unknown[] = [
    {
      text: `
      Eres un profesor experto de inglés en España.
      Analiza detenidamente estas fotos/escaneos de páginas de un libro de texto y/o cuaderno de ejercicios de 3º de la ESO para preparar un examen escolar inminente.
      
      Tareas que debes realizar:
      1. Extraer las unidades o temas gramaticales presentes en las páginas (con título, descripción, puntos gramaticales y vocabulario clave).
      2. Extraer o recrear con máxima fidelidad 6 ejercicios idénticos a los del libro/apuntes (mezcla de rellenar huecos, opción múltiple y transformación/reescritura de frases de 3º ESO), con sus soluciones exactas y explicaciones en español.
      3. Redactar una ficha teórica esquemática en HTML con Tailwind (con tarjetas 'bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6') resumiendo las fórmulas, reglas y trucos de examen que aparecen en estas páginas.
      `
    }
  ];

  for (const page of pages) {
    // Si viene con data:image/png;base64,... limpiamos el prefijo
    const cleanBase64 = page.base64Data.includes(',') 
      ? page.base64Data.split(',')[1] 
      : page.base64Data;

    contentsParts.push({
      inlineData: {
        data: cleanBase64,
        mimeType: page.mimeType || 'image/jpeg',
      }
    });
  }

  const analysisSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      detectedUnits: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            unitTitle: { type: Type.STRING },
            description: { type: Type.STRING },
            grammarPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            vocabulary: { type: Type.ARRAY, items: { type: Type.STRING } },
            summaryNotesSpanish: { type: Type.STRING },
          },
          required: ["unitTitle", "description", "grammarPoints", "summaryNotesSpanish"]
        }
      },
      sampleExtractedExercises: questionsResponseSchema,
      recommendedTheoryCheatSheetHtml: { type: Type.STRING }
    },
    required: ["detectedUnits", "sampleExtractedExercises", "recommendedTheoryCheatSheetHtml"]
  };

  const client = getAi();
  if (!client) {
    throw new Error("No se pudo inicializar la conexión con Gemini.");
  }

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: contentsParts as unknown as string,
    config: {
      responseMimeType: "application/json",
      responseSchema: analysisSchema,
    }
  });

  return JSON.parse(response.text || "{}") as AnalyzedPageResult;
};

// Fallback robusto para preguntas de 3º ESO si no hay conexión o falla la API
function getFallbackQuestions(topicId: string, count: number): Question[] {
  const bank: Question[] = [
    {
      id: 'fb-3eso-1',
      text: 'I _______ (not see) Lucas since we finished primary school.',
      type: QuestionType.FILL_BLANK,
      correctAnswer: "haven't seen",
      acceptableAnswers: ["have not seen", "haven't seen"],
      hint: "Usa el Present Perfect porque aparece el marcador 'since'.",
      explanation: "Con 'since' (desde) indicamos un periodo que empezó en el pasado y continúa hasta el presente, por lo que se utiliza Present Perfect Simple: haven't seen."
    },
    {
      id: 'fb-3eso-2',
      originalSentence: "It is not necessary for you to wear a tie at this party.",
      keyWord: "HAVE",
      text: "You _______ wear a tie at this party.",
      type: QuestionType.SENTENCE_TRANSFORMATION,
      correctAnswer: "don't have to",
      acceptableAnswers: ["do not have to", "don't have to"],
      hint: "'Not necessary' equivale a la falta de obligación con have to.",
      explanation: "En 3º ESO, 'it is not necessary' se transforma habitualmente en 'don't / doesn't have to' (no hace falta / no tienes por qué)."
    },
    {
      id: 'fb-3eso-3',
      text: 'Look at that woman in the limousine. She _______ be a famous celebrity!',
      type: QuestionType.MULTIPLE_CHOICE,
      options: ['must', "can't", 'shouldn\'t', 'might not'],
      correctAnswer: 'must',
      hint: "Deducción lógica positiva con alta certeza basada en una evidencia visual.",
      explanation: "Usamos 'must be' cuando tenemos una certeza casi del 100% basada en la evidencia (limusina = tiene que ser famosa)."
    },
    {
      id: 'fb-3eso-4',
      originalSentence: "They built this historical castle in the 14th century.",
      keyWord: "WAS",
      text: "This historical castle _______ in the 14th century.",
      type: QuestionType.SENTENCE_TRANSFORMATION,
      correctAnswer: "was built",
      acceptableAnswers: ["was built"],
      hint: "Pasa de activa a pasiva en Past Simple (was/were + participio).",
      explanation: "En la voz pasiva de Past Simple utilizamos was/were + participio del verbo principal: 'was built'."
    },
    {
      id: 'fb-3eso-5',
      text: 'Have you _______ to Japan? It is an unforgettable journey.',
      type: QuestionType.MULTIPLE_CHOICE,
      options: ['ever been', 'already gone', 'never been', 'yet went'],
      correctAnswer: 'ever been',
      hint: "Para preguntar por experiencias en la vida usamos 'ever' con 'been'.",
      explanation: "En preguntas de experiencias de vida utilizamos 'Have you ever been...?' (¿Alguna vez has estado...?)."
    },
    {
      id: 'fb-3eso-6',
      text: 'While we _______ (walk) along the beach, my brother found a message in a bottle.',
      type: QuestionType.FILL_BLANK,
      correctAnswer: "were walking",
      acceptableAnswers: ["were walking"],
      hint: "'While' introduce una acción continua en progreso en el pasado.",
      explanation: "Detrás de 'while' usamos Past Continuous ('were walking') para describir la acción que estaba en desarrollo cuando ocurrió una acción puntual ('found')."
    },
    {
      id: 'fb-3eso-7',
      originalSentence: "I didn't drink coffee when I was younger, but now I love it.",
      keyWord: "USE",
      text: "I didn't _______ drink coffee when I was younger.",
      type: QuestionType.SENTENCE_TRANSFORMATION,
      correctAnswer: "use to",
      acceptableAnswers: ["use to"],
      hint: "En negativa con didn't el verbo va en infinitivo sin la -d: 'use to'.",
      explanation: "¡Fallo típico de examen de 3º ESO! En negativas ('didn't') e interrogativas ('did you...?') se escribe 'use to' y no 'used to'."
    },
    {
      id: 'fb-3eso-8',
      text: 'That is the school _______ my mother worked as a science teacher.',
      type: QuestionType.MULTIPLE_CHOICE,
      options: ['where', 'which', 'who', 'whose'],
      correctAnswer: 'where',
      hint: "Pronombre relativo para referirse a un lugar.",
      explanation: "Utilizamos 'where' como pronombre relativo cuando nos referimos a un lugar donde ocurre una acción."
    }
  ];

  return bank.slice(0, count);
}

function getFallbackTheory(topic?: Topic): TheoryContent {
  return {
    title: topic ? topic.title : "Ficha Teórica 3º ESO",
    summarySpanish: "Reglas clave, fórmulas visuales y trampas típicas del examen de 3º ESO.",
    htmlContent: `
      <div class="space-y-6 text-slate-800">
        <div class="bg-indigo-50 border-2 border-indigo-200 p-6 rounded-3xl">
          <span class="text-xs font-black uppercase tracking-wider text-indigo-700 block mb-2">Objetivo 3º ESO</span>
          <h3 class="text-2xl font-black text-indigo-950 mb-2">${topic?.title || 'Grammar Overview'}</h3>
          <p class="text-slate-700 font-medium">${topic?.description || 'Repaso de estructuras y vocabulario para el examen.'}</p>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h4 class="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
            <span class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm">1</span>
            Fórmula Estructural
          </h4>
          <p class="text-slate-600 mb-4">Asegúrate de recordar la posición de los auxiliares y formas verbales:</p>
          <div class="bg-slate-50 p-4 rounded-xl font-mono text-sm border border-slate-200 text-indigo-700 space-y-2">
            <div><strong>Affirmative:</strong> Subject + Auxiliary + Verb + Complements</div>
            <div><strong>Negative:</strong> Subject + Auxiliary + NOT + Verb + Complements</div>
            <div><strong>Question:</strong> (Wh-) + Auxiliary + Subject + Verb...?</div>
          </div>
        </div>

        <div class="bg-amber-50 p-6 rounded-2xl border border-amber-200">
          <h4 class="text-lg font-black text-amber-900 mb-2">¡Ojo a las trampas del profesor en el examen!</h4>
          <ul class="list-disc list-inside space-y-2 text-amber-800 text-sm font-medium">
            <li>No confundas <em>for</em> (duración: for 2 years) con <em>since</em> (año/fecha concreta: since 2021).</li>
            <li>En oraciones negativas con <em>didn't</em> recuerda escribir <strong>use to</strong> (sin la -d final).</li>
            <li>En voz pasiva, comprueba siempre si el sujeto es singular (<em>was</em>) o plural (<em>were</em>).</li>
          </ul>
        </div>
      </div>
    `
  };
}
