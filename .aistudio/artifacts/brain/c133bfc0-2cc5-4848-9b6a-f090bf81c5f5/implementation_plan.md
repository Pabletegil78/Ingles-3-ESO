# English Quest 3º ESO — Plan de Renovación Completa y Adaptación al Nuevo Temario

Plan integral para renovar la aplicación de preparación de exámenes de inglés, retirando el contenido anterior de 2º de la ESO y adaptando la arquitectura para recibir las nuevas páginas (teoría y ejercicios) de 3º de la ESO que vas a subir, manteniendo y potenciando la experiencia interactiva previa (XP, rachas, fichas visuales, feedback explicativo y simulacros).

---

## Decisiones Críticas y Resumen de Preferencias

> [!IMPORTANT]
> **Opciones confirmadas y consideraciones del sistema anterior:**
> - **Enfoque Pedagógico**: Práctica tipo examen complementada con fichas de teoría visual y explicaciones paso a paso en español con ejemplos en inglés.
> - **Tipología de Ejercicios**: Mezcla equilibrada de **Rellenar huecos** (`fill_blank`), **Opción múltiple** (`multiple_choice`) y **Transformación / Reescritura de oraciones** (`sentence_transformation`), fundamental en 3º ESO.
> - **Modos de Estudio (Evolución de la versión anterior)**:
>   1. **Ficha Teórica Visual**: "Cheat sheets" esquemáticas con reglas, tablas comparativas y trucos en español.
>   2. **Práctica Interactiva**: Configurable en 5, 10 o 15 ejercicios, con sistema de XP, feedback instantáneo y streak.
>   3. **Simulacro de Examen Global**: Mezcla de todas las unidades con temporizador opcional y calificación final sobre 10.
> - **Ingesta de Contenido Nuevo**: Escáner / Subida directa de fotos (o pegar texto de las páginas de 3º ESO) usando visión multimodal con Gemini para generar al vuelo los temas, resúmenes y baterías de preguntas reales del libro de tu hijo.

---

## 1. Visión General y Concepto Central

- **Propósito**: Preparar al alumno para su examen de 3º ESO de mañana de forma amena, rigurosa y directa a los puntos clave que entran en su temario real.
- **Audiencia**: Alumno de 3º ESO (14-15 años, nivel A2+/B1) y su padre/tutor para supervisar el progreso y subir las páginas del libro.
- **Valor Principal**: Adaptación exacta a los contenidos del libro o apuntes subidos, evitando ejercicios genéricos que no entran en el examen y reforzando las dudas con explicaciones comprensibles.

---

## 2. Experiencia de Usuario y Diseño Visual

### Flujos Principales
1. **Pantalla Principal (Dashboard 3º ESO)**:
   - Cabecera limpia con nivel, total de XP acumulado y selector de modo.
   - **Bandeja de Carga de Temario**: Zona para subir o ver las fotos/páginas analizadas de 3º ESO con indicador de unidades detectadas.
   - **Tarjetas de Unidades de 3º ESO**: Cada bloque temático muestra su ficha teórica, progreso de práctica y botón directo de inicio.
   - **Reto Examen Global**: Tarjeta destacada para realizar un simulacro completo del examen con puntuación final.
2. **Visor de Ficha Teórica**:
   - Tarjetas esquemáticas con reglas concisas, cajas de "Pro-Tip" en español, tablas de conjugación/estructuras y botón directo a practicar.
3. **Módulo de Práctica y Ejercicios**:
   - Barra de progreso superior con indicador de aciertos/fallos y XP en tiempo real.
   - Soporte para 3 tipos de preguntas:
     - *Opción Múltiple*: Botones grandes y accesibles con respuesta inmediata.
     - *Rellenar Huecos*: Hueco interactivo en la frase con autocomprobación.
     - *Reescritura de Frases*: "Rewrite the sentence so it means the same..." con teclado o input asistido.
   - Cortina inferior de feedback con icono de éxito/error, solución correcta resaltada y tarjeta "¿Por qué es así?" en español.
4. **Pantalla de Resultados y Resumen**:
   - Puntuación porcentual, XP ganado, desglose de aciertos y botón para repasar los fallos específicos del intento.

### Identidad Visual y Estilo
- **Paleta de Color (Regla 60-30-10)**:
  - 60% Lienzo Neutro: Fondos limpios en slate/azul suave (`#F8FAFC`).
  - 30% Superficies Estructurales: Tarjetas blancas con bordes sutiles y sombras de elevación única.
  - 10% Acentos Focales: Azul índigo vibrante para acciones primarias, esmeralda para aciertos y ámbar para XP/trofeos.
- **Tipografía**: Jerarquía editorial clara sin textos "slop", con números tabulares para puntuaciones y preguntas de examen legibles y bien contrastadas.

---

## 3. Decisiones de Producto y Filosofía Técnica

1. **Eliminación y Desacoplamiento del Temario 2º ESO**:
   - Se vacían los datos fijos de unidades 7-9 de 2º ESO en `constants.ts`.
   - Se establece una estructura extensible donde las unidades de 3º ESO se cargan tanto desde un set base como desde el analizador de fotos que vas a subir.
2. **Motor de IA Multimodal (Gemini)**:
   - Capacidad de procesar imágenes de las páginas del libro (apuntes de teoría y páginas de ejercicios) para extraer la gramática exacta, listas de vocabulario y modelos de preguntas del profesor.
3. **Persistencia Local**:
   - Todo el progreso (XP, historial de preguntas, unidades analizadas y estadísticas de acierto) se guarda en `localStorage` para que no se pierda al recargar la página.

---

## 4. Arquitectura del Sistema y Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                    English Quest 3º ESO                     │
├──────────────────────────────┬──────────────────────────────┤
│       Dashboard View         │      Config / Modal View     │
│  - Total XP & Streak         │  - Modo Práctica (5/10/15)   │
│  - Tarjetas de Unidades      │  - Modo Ficha Teórica        │
│  - Botón Subir Páginas 3ºESO │  - Modo Simulacro Examen     │
│  - Tarjeta Gran Reto Examen  │                              │
├──────────────────────────────┴──────────────────────────────┤
│                   Study & Exercise Engine                   │
├──────────────────────────────┬──────────────────────────────┤
│      Theory Sheet View       │       Interactive Quiz       │
│  - Reglas visuales           │  - Multiple Choice           │
│  - Pro-Tips en español       │  - Fill-in-the-blank         │
│  - Ejemplos contrastados     │  - Sentence Transformation   │
│  - Botón "Ir a Practicar"    │  - Cortina Feedback Instant. │
├──────────────────────────────┴──────────────────────────────┤
│                   Gemini Multimodal Service                 │
│  - Extracción de contenido desde fotos de páginas           │
│  - Generación de ejercicios calibrados a 3º ESO             │
│  - Explicaciones pedagógicas detalladas en español          │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Estado
- `topics`: Lista dinámica de unidades de 3º ESO (proveniente de las páginas subidas o configuradas).
- `currentView`: `'dashboard' | 'theory' | 'quiz' | 'results' | 'upload_pages'`.
- `session`: Sesión activa con preguntas generadas, índice actual, puntuación, racha y desglose para revisión de fallos.
- `totalXP`: Persistido en `localStorage`.

---

## Próximo Paso
Una vez apruebes este plan, quedo listo para recibir las fotos de las páginas de teoría y ejercicios de 3º ESO de tu hijo para estructurar exactamente el temario de su examen.
