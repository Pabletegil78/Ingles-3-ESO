import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, ArrowRight, ChevronLeft, CheckCircle2, XCircle, BookOpen, 
  PlayCircle, GraduationCap, Calendar, AlertCircle, CloudLightning, 
  TreeDeciduous, Zap, Target, Upload, Camera, Image as ImageIcon, 
  Clock, Trash2, RefreshCw, HelpCircle, FileText, Sliders, Gauge
} from 'lucide-react';
import { INITIAL_TOPICS_3ESO, STORAGE_KEYS } from './constants';
import { Button } from './components/Button';
import { generateQuestions, generateTheory, analyzePagesWithGemini, getDifficultyInfo } from './services/geminiService';
import { Question, QuizSession, QuestionType, TheoryContent, Topic, UploadedPage } from './types';
import { safeStorage } from './utils/storage';

const IconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Calendar,
  CloudLightning,
  AlertCircle,
  TreeDeciduous,
  BookOpen,
  Target
};

type ViewState = 'dashboard' | 'loading' | 'theory' | 'quiz' | 'results' | 'upload_pages';

export default function App() {
  const [view, setView] = useState<ViewState>('dashboard');
  const [topics, setTopics] = useState<Topic[]>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.TOPICS_3ESO);
      return saved ? JSON.parse(saved) : INITIAL_TOPICS_3ESO;
    } catch {
      return INITIAL_TOPICS_3ESO;
    }
  });

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [isTimedMode, setIsTimedMode] = useState<boolean>(false);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [theory, setTheory] = useState<TheoryContent | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>("Cargando...");
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [showFeedback, setShowFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [showHint, setShowHint] = useState<boolean>(false);
  const [totalXP, setTotalXP] = useState<number>(() => {
    const saved = safeStorage.getItem(STORAGE_KEYS.TOTAL_XP);
    return saved ? Number(saved) : 120;
  });

  // Estado para gestión y subida de fotos
  const [uploadedPages, setUploadedPages] = useState<UploadedPage[]>(() => {
    try {
      const saved = safeStorage.getItem(STORAGE_KEYS.UPLOADED_PAGES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isAnalyzingPages, setIsAnalyzingPages] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Temporizador para modo contrarreloj
  const [timerSeconds, setTimerSeconds] = useState<number>(0);

  // Nivel de dificultad (0 a 10, por defecto 5 = estándar 3º ESO)
  const [difficulty, setDifficulty] = useState<number>(() => {
    try {
      const saved = safeStorage.getItem('english_quest_difficulty');
      return saved !== null ? Number(saved) : 5;
    } catch {
      return 5;
    }
  });

  useEffect(() => {
    safeStorage.setItem('english_quest_difficulty', difficulty.toString());
  }, [difficulty]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEYS.TOTAL_XP, totalXP.toString());
  }, [totalXP]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEYS.TOPICS_3ESO, JSON.stringify(topics));
  }, [topics]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEYS.UPLOADED_PAGES, JSON.stringify(uploadedPages));
  }, [uploadedPages]);

  // Manejador del temporizador
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (view === 'quiz' && isTimedMode && session && showFeedback === 'none' && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleAnswerSubmit("__TIMEOUT__");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [view, isTimedMode, session, showFeedback, timerSeconds]);

  const handleTopicClick = (topicId: string) => {
    setSelectedTopicId(topicId);
    setQuestionCount(5);
    setIsTimedMode(false);
    setShowConfigModal(true);
  };

  const startPractice = async (topicId: string, count: number, timed: boolean = false, customDifficulty?: number) => {
    setShowConfigModal(false);
    setView('loading');
    const selectedDifficulty = customDifficulty ?? difficulty;
    const diffInfo = getDifficultyInfo(selectedDifficulty);
    setLoadingMessage(`Generando ejercicios con IA (${diffInfo.tag} · ${diffInfo.label})...`);
    try {
      const questions = await generateQuestions(topicId, count, topics, selectedDifficulty);
      const targetTopic = topics.find(t => t.id === topicId);
      const title = topicId === 'exam' ? 'Simulacro Examen Global 3º ESO' : (targetTopic?.title || 'Práctica');

      setSession({
        topicId,
        topicTitle: title,
        questions,
        currentIndex: 0,
        score: 0,
        streak: 0,
        history: [],
        userAnswers: [],
        isTimed: timed,
        timeRemaining: timed ? 60 : undefined,
        difficultyLevel: selectedDifficulty,
      });
      setUserAnswer("");
      setShowFeedback('none');
      setShowHint(false);
      if (timed) setTimerSeconds(60);
      setView('quiz');
    } catch (e) {
      console.error(e);
      setView('dashboard');
    }
  };

  const startTheory = async (topicId: string) => {
    setShowConfigModal(false);
    setView('loading');
    setLoadingMessage("Preparando la ficha visual de 3º ESO...");
    try {
      const content = await generateTheory(topicId, topics);
      setTheory(content);
      setView('theory');
    } catch (e) {
      console.error(e);
      setView('dashboard');
    }
  };

  const handleAnswerSubmit = (answer: string) => {
    if (!session || showFeedback !== 'none') return;
    const currentQ = session.questions[session.currentIndex];
    
    // Normalizar para comparación flexible
    const normalize = (str: string) => 
      str.toLowerCase().replace(/['']/g, "'").trim().replace(/\s+/g, ' ');

    const cleanUser = normalize(answer);
    const cleanCorrect = normalize(currentQ.correctAnswer);
    const acceptable = (currentQ.acceptableAnswers || []).map(normalize);

    const isCorrect = answer !== "__TIMEOUT__" && (
      cleanUser === cleanCorrect || 
      acceptable.includes(cleanUser) ||
      (currentQ.type === QuestionType.SENTENCE_TRANSFORMATION && cleanUser.includes(cleanCorrect))
    );

    setShowFeedback(isCorrect ? 'correct' : 'incorrect');

    const scoreDelta = isCorrect ? (15 + session.streak * 5) : 0;

    setSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        score: prev.score + scoreDelta,
        streak: isCorrect ? prev.streak + 1 : 0,
        history: [...prev.history, isCorrect],
        userAnswers: [
          ...prev.userAnswers,
          {
            questionId: currentQ.id,
            questionText: currentQ.text,
            userAnswer: answer === "__TIMEOUT__" ? "Tiempo agotado" : answer,
            correctAnswer: currentQ.correctAnswer,
            isCorrect,
            explanation: currentQ.explanation
          }
        ]
      };
    });
  };

  const handleNextQuestion = () => {
    if (!session) return;
    if (session.currentIndex + 1 >= session.questions.length) {
      setTotalXP(prev => prev + session.score);
      setView('results');
    } else {
      setSession(prev => prev ? ({ ...prev, currentIndex: prev.currentIndex + 1 }) : null);
      setShowFeedback('none');
      setUserAnswer("");
      setShowHint(false);
      if (session.isTimed) setTimerSeconds(60);
    }
  };

  // Procesamiento de subida de fotos
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    const newPages: UploadedPage[] = [];

    Array.from(files).forEach((fileItem) => {
      const file = fileItem as File;
      if (!file.type.startsWith('image/')) {
        setUploadError("Por favor, sube únicamente archivos de imagen (fotos en JPG, PNG o WebP).");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          const newPage: UploadedPage = {
            id: `page_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            name: file.name,
            dataUrl,
            timestamp: Date.now(),
            size: file.size
          };
          setUploadedPages(prev => [...prev, newPage]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemovePage = (pageId: string) => {
    setUploadedPages(prev => prev.filter(p => p.id !== pageId));
  };

  const handleAnalyzePages = async () => {
    if (uploadedPages.length === 0) return;
    setIsAnalyzingPages(true);
    setUploadError(null);

    try {
      const payload = uploadedPages.map(p => ({
        base64Data: p.dataUrl,
        mimeType: 'image/jpeg',
        name: p.name
      }));

      const analysis = await analyzePagesWithGemini(payload);

      if (analysis.detectedUnits && analysis.detectedUnits.length > 0) {
        // Construir nuevas unidades a partir de las páginas analizadas
        const newExtractedTopics: Topic[] = analysis.detectedUnits.map((unit, idx) => ({
          id: `custom_unit_${Date.now()}_${idx}`,
          unitCode: `Unit 3º ESO • ${unit.unitTitle.slice(0, 12)}`,
          title: unit.unitTitle,
          description: unit.description,
          icon: 'BookOpen',
          color: idx % 2 === 0 ? 'bg-indigo-600' : 'bg-emerald-600',
          systemPromptContext: `
            Contenido extraído directamente de las páginas de 3º ESO:
            Puntos Gramaticales: ${unit.grammarPoints.join(', ')}
            Vocabulario: ${(unit.vocabulary || []).join(', ')}
            Notas y resumen: ${unit.summaryNotesSpanish}
          `,
          isCustomFromPhoto: true,
          extractedFromPageCount: uploadedPages.length,
          sampleKeywords: unit.grammarPoints.slice(0, 4)
        }));

        // Añadir o reemplazar temas
        setTopics(prev => [...newExtractedTopics, ...prev]);
        setView('dashboard');
      } else {
        setUploadError("No se pudieron detectar unidades de forma clara en las imágenes. Intenta sacar fotos con más luz o texto más nítido.");
      }
    } catch (err) {
      console.error(err);
      setUploadError("Hubo un problema al procesar las fotos con Gemini. Verifica que las imágenes sean nítidas e inténtalo de nuevo.");
    } finally {
      setIsAnalyzingPages(false);
    }
  };

  const handleResetToDefault3ESO = () => {
    if (window.confirm("¿Deseas restablecer el temario base oficial de 3º ESO? Se mantendrán tus puntos XP acumulados.")) {
      setTopics(INITIAL_TOPICS_3ESO);
      setUploadedPages([]);
    }
  };

  // VISTA: DASHBOARD
  const renderDashboard = () => (
    <div className="max-w-5xl mx-auto p-6 pb-24">
      {/* Top Header Contract */}
      <header className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6 pt-6 border-b border-slate-200 pb-8">
        <div className="text-center md:text-left">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 tracking-wider uppercase mb-1">
            <span>Curso Escolar</span>
            <span>·</span>
            <span>3º ESO</span>
            <span>·</span>
            <span className="text-emerald-700">Temario Actualizado</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            English <span className="text-indigo-600">Quest</span>
          </h1>
          <p className="text-slate-500 font-medium text-lg mt-1">
            Preparación para el examen de inglés · 3º de la ESO
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setView('upload_pages')}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-50 border-2 border-indigo-200 text-indigo-700 font-bold hover:bg-indigo-100 transition-all active:scale-95 shadow-sm"
          >
            <Camera size={20} className="text-indigo-600" />
            <span>Subir Páginas ({uploadedPages.length})</span>
          </button>

          <div className="flex items-center gap-2.5 bg-amber-50 text-amber-800 px-5 py-3 rounded-2xl font-black border-2 border-amber-200 shadow-sm">
            <Trophy size={24} className="text-amber-600" />
            <span className="text-xl tabular-nums">{totalXP} <span className="text-xs uppercase text-amber-700 font-bold">XP</span></span>
          </div>
        </div>
      </header>

      {/* Banner de Notificación del Temario 3º ESO */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-100 rounded-3xl p-6 mb-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white text-indigo-600 rounded-2xl shadow-sm border border-indigo-100 shrink-0">
            <FileText size={28} />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-slate-900">Temario anterior de 2º ESO eliminado</h3>
            <p className="text-slate-600 text-sm mt-0.5">
              Hemos adaptado la plataforma a 3º de la ESO. Sube las fotos de las páginas de teoría y ejercicios del libro de tu hijo para calibrar las preguntas a su examen exacto.
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="primary" onClick={() => setView('upload_pages')}>
            Añadir Páginas del Libro
          </Button>
          <button 
            onClick={handleResetToDefault3ESO} 
            title="Restablecer temario base" 
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Control Deslizador de Dificultad Dinámica (0 a 10) */}
      {(() => {
        const currentDiffInfo = getDifficultyInfo(difficulty);
        return (
          <div className="bg-white rounded-3xl border-2 border-slate-100 p-6 md:p-8 mb-10 shadow-sm relative overflow-hidden transition-all hover:border-slate-200">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-6">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className={`p-3.5 rounded-2xl ${currentDiffInfo.badgeBg} border ${currentDiffInfo.badgeBorder} shrink-0`}>
                  <Sliders size={26} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="font-extrabold text-xl text-slate-900">
                      Nivel de Dificultad y Complejidad
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-black border tracking-wide ${currentDiffInfo.badgeBg} ${currentDiffInfo.badgeBorder}`}>
                      {difficulty}/10 · {currentDiffInfo.label}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm mt-1">
                    {currentDiffInfo.description}
                  </p>
                </div>
              </div>

              {/* Botones de selección rápida */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { val: 0, label: '0 Mínimo' },
                  { val: 3, label: '3 Básico' },
                  { val: 5, label: '5 Estándar (3º ESO)' },
                  { val: 8, label: '8 Difícil' },
                  { val: 10, label: '10 Máximo B1+' },
                ].map((p) => (
                  <button
                    key={p.val}
                    onClick={() => setDifficulty(p.val)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      difficulty === p.val
                        ? 'bg-slate-900 text-white shadow-md scale-105'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Deslizador (Slider) 0 a 10 */}
            <div className="px-2 pt-2">
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={difficulty}
                  onChange={(e) => setDifficulty(Number(e.target.value))}
                  className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none transition-all"
                  aria-label="Deslizador de dificultad de 0 a 10"
                />
              </div>

              {/* Marcas de referencia */}
              <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 mt-2 px-1">
                <span className={difficulty <= 2 ? 'text-emerald-700 font-black' : ''}>0 (Mínimo)</span>
                <span className={difficulty >= 3 && difficulty <= 4 ? 'text-teal-700 font-black' : ''}>3 (Básico)</span>
                <span className={difficulty === 5 ? 'text-indigo-700 font-black bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200' : ''}>
                  5 (Estándar 3º ESO)
                </span>
                <span className={difficulty >= 6 && difficulty <= 7 ? 'text-amber-700 font-black' : ''}>7 (Exigente)</span>
                <span className={difficulty >= 8 && difficulty <= 9 ? 'text-orange-700 font-black' : ''}>8-9 (Sobresaliente)</span>
                <span className={difficulty === 10 ? 'text-rose-700 font-black' : ''}>10 (Máximo B1+)</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tarjetas de Unidades de 3º ESO */}
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-900">Unidades de Estudio (3º ESO)</h2>
        <span className="text-sm font-semibold text-slate-500">{topics.length} temas listos</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {topics.map((topic) => {
          const Icon = IconMap[topic.icon] || BookOpen;
          return (
            <div
              key={topic.id}
              className="bg-white p-7 rounded-[2rem] border-2 border-slate-100 hover:border-indigo-300 hover:shadow-xl transition-all text-left flex flex-col justify-between shadow-sm relative group"
            >
              {topic.isCustomFromPhoto && (
                <div className="absolute top-6 right-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={12} />
                    Extraído de tus fotos
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3.5 rounded-2xl ${topic.color} bg-opacity-10 text-indigo-700`}>
                    <Icon size={28} />
                  </div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    {topic.unitCode || '3º ESO'}
                  </span>
                </div>

                <h3 className="font-extrabold text-2xl text-slate-900 mb-2">
                  {topic.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  {topic.description}
                </p>

                {topic.sampleKeywords && topic.sampleKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {topic.sampleKeywords.map((kw, i) => (
                      <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  onClick={() => startTheory(topic.id)}
                  className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors"
                >
                  <BookOpen size={18} />
                  Ficha Teórica
                </button>
                <Button 
                  size="sm" 
                  variant="primary" 
                  onClick={() => handleTopicClick(topic.id)}
                  className="px-5"
                >
                  Practicar <ArrowRight size={16} className="ml-1" />
                </Button>
              </div>
            </div>
          );
        })}

        {/* Reto Final: Examen Global 3º ESO */}
        <div className="md:col-span-2 relative bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 p-10 rounded-[2.5rem] shadow-xl text-white overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6 text-center md:text-left">
              <div className="p-6 bg-white/10 rounded-3xl backdrop-blur-md border border-white/20 shrink-0">
                <GraduationCap size={48} className="text-white" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-xs font-black uppercase tracking-widest text-indigo-300 block">
                    Simulación Oficial
                  </span>
                  {(() => {
                    const dInfo = getDifficultyInfo(difficulty);
                    return (
                      <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/20">
                        🎯 Nivel {difficulty}/10 · {dInfo.label}
                      </span>
                    );
                  })()}
                </div>
                <h3 className="font-black text-3xl mb-2">Reto Final: Examen Completo 3º ESO</h3>
                <p className="text-indigo-100 text-base max-w-xl opacity-90">
                  Prueba de 10 ejercicios con preguntas de huecos, opción múltiple y reescritura de oraciones combinadas.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <button
                onClick={() => { setSelectedTopicId('exam'); setQuestionCount(10); startPractice('exam', 10, true); }}
                className="px-6 py-4 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-extrabold text-sm flex items-center gap-2 backdrop-blur-sm border border-white/20 transition-all active:scale-95"
              >
                <Clock size={18} /> Con Tiempo (60s/pregunta)
              </button>
              <button
                onClick={() => { setSelectedTopicId('exam'); setQuestionCount(10); startPractice('exam', 10, false); }}
                className="px-8 py-4 rounded-2xl bg-white text-indigo-700 font-black text-lg shadow-lg hover:bg-indigo-50 transition-all active:scale-95"
              >
                EMPEZAR EXAMEN
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // VISTA: SUBIDA Y ANÁLISIS DE PÁGINAS DEL LIBRO
  const renderUploadPages = () => (
    <div className="max-w-4xl mx-auto p-6 pb-24">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => setView('dashboard')} 
          className="text-slate-500 hover:text-indigo-600 flex items-center gap-2 font-bold text-base transition-colors"
        >
          <ChevronLeft size={20} /> Volver al Inicio
        </button>
        <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
          Escáner Multimodal Gemini 3.8
        </span>
      </div>

      <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm p-8 md:p-12 mb-8">
        <div className="max-w-xl mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
            <Camera size={32} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-3">
            Sube las páginas de 3º ESO de tu hijo
          </h2>
          <p className="text-slate-600 leading-relaxed text-base">
            Sube fotos de las páginas del libro (teoría, cuadros de gramática, vocabulario y ejercicios) o apuntes del cuaderno. Gemini las leerá para crear las unidades exactas y preguntas idénticas a las de su profesor.
          </p>
        </div>

        {/* Zona de Arrastre / Selección */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-3 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/70 transition-all rounded-3xl p-10 text-center cursor-pointer mb-8"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            multiple 
            className="hidden" 
          />
          <div className="mx-auto w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600 mb-4 border border-indigo-100">
            <Upload size={32} />
          </div>
          <h3 className="font-extrabold text-xl text-slate-800 mb-1">
            Haz clic o arrastra fotos aquí
          </h3>
          <p className="text-slate-500 text-sm">
            Formatos soportados: JPG, PNG, WEBP (puedes subir varias fotos a la vez)
          </p>
        </div>

        {uploadError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold mb-6 flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Galería de páginas cargadas */}
        {uploadedPages.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                Páginas listas para analizar ({uploadedPages.length})
              </h4>
              <button 
                onClick={() => setUploadedPages([])}
                className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1"
              >
                <Trash2 size={14} /> Borrar todas
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {uploadedPages.map((page) => (
                <div key={page.id} className="relative group rounded-2xl overflow-hidden border-2 border-slate-200 aspect-[3/4] bg-slate-100 shadow-sm">
                  <img 
                    src={page.dataUrl} 
                    alt={page.name} 
                    className="w-full h-full object-cover" 
                  />
                  <button 
                    onClick={() => handleRemovePage(page.id)}
                    className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity shadow-md"
                    title="Eliminar página"
                  >
                    <XCircle size={16} />
                  </button>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900/80 to-transparent p-2 text-white text-[11px] truncate font-medium">
                    {page.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botón de acción */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-6 border-t border-slate-100">
          <Button 
            variant="outline" 
            onClick={() => setView('dashboard')}
            disabled={isAnalyzingPages}
          >
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAnalyzePages}
            disabled={uploadedPages.length === 0 || isAnalyzingPages}
            loading={isAnalyzingPages}
            className="w-full sm:w-auto px-8"
          >
            {isAnalyzingPages ? "Analizando fotos con IA..." : `Analizar ${uploadedPages.length} Página(s) y Generar Temario`}
          </Button>
        </div>
      </div>
    </div>
  );

  // VISTA: MODAL DE CONFIGURACIÓN DE PRÁCTICA
  const renderConfigModal = () => {
    if (!showConfigModal || !selectedTopicId) return null;
    const topic = topics.find(t => t.id === selectedTopicId);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg p-10 relative overflow-hidden animate-in zoom-in-95 duration-200 border-b-8 border-slate-100">
          <button 
            onClick={() => setShowConfigModal(false)} 
            className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 hover:rotate-90 transition-all p-2"
          >
            <XCircle size={28} />
          </button>

          <span className="text-xs font-black uppercase tracking-widest text-indigo-600 block mb-1">
            {topic?.unitCode || '3º ESO'}
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2">{topic?.title}</h2>
          <p className="text-slate-500 text-base mb-8">¿Cómo prefieres enfocar este repaso?</p>

          <div className="space-y-4">
            {/* Opción 1: Ficha Teórica */}
            <button 
              onClick={() => selectedTopicId && startTheory(selectedTopicId)} 
              className="w-full flex items-center gap-5 p-5 rounded-2xl border-2 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-left group"
            >
              <div className="bg-indigo-100 p-4 rounded-xl text-indigo-700 group-hover:scale-105 transition-transform">
                <BookOpen size={28} />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Ver Ficha Teórica Visual</h3>
                <p className="text-slate-500 text-sm">Reglas clave, esquemas y trampas típicas</p>
              </div>
            </button>

            {/* Opción 2: Práctica de Ejercicios */}
            <div className="p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-200">
              <div className="flex items-center gap-4 mb-5">
                <div className="bg-white p-3 rounded-xl text-emerald-600 shadow-sm">
                  <PlayCircle size={28} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">Práctica Interactiva</h3>
                  <p className="text-slate-600 text-xs">Ejercicios de huecos, test y reescritura</p>
                </div>
              </div>

              {/* Selector de número de preguntas */}
              <div className="mb-5">
                <div className="flex justify-between items-center mb-2 px-1">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Cantidad de ejercicios
                  </span>
                  <span className="text-emerald-800 font-extrabold text-sm">{questionCount} preguntas</span>
                </div>
                <div className="flex gap-2">
                  {[5, 10, 15].map(num => (
                    <button 
                      key={num} 
                      onClick={() => setQuestionCount(num)} 
                      className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        questionCount === num 
                          ? 'bg-emerald-600 text-white shadow-md' 
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle de Modo Con Tiempo */}
              <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-emerald-200 mb-6">
                <div className="flex items-center gap-2.5">
                  <Clock size={18} className="text-emerald-700" />
                  <span className="text-sm font-bold text-slate-800">Modo simulacro (con tiempo)</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={isTimedMode} 
                  onChange={(e) => setIsTimedMode(e.target.checked)}
                  className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                />
              </div>

              {/* Selector de Nivel de Dificultad para esta sesión */}
              <div className="mb-6 bg-white p-4 rounded-xl border border-emerald-200 shadow-xs">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders size={14} className="text-indigo-600" />
                    Dificultad de los ejercicios
                  </span>
                  {(() => {
                    const dInfo = getDifficultyInfo(difficulty);
                    return (
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${dInfo.badgeBg} ${dInfo.badgeBorder}`}>
                        {difficulty}/10 · {dInfo.label}
                      </span>
                    );
                  })()}
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="10" 
                  step="1" 
                  value={difficulty} 
                  onChange={(e) => setDifficulty(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  aria-label="Dificultad de los ejercicios"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1.5">
                  <span>0 (Mínimo)</span>
                  <span>5 (Estándar 3º ESO)</span>
                  <span>10 (Máximo)</span>
                </div>
              </div>

              <Button 
                className="w-full py-4 text-lg" 
                variant="secondary" 
                onClick={() => selectedTopicId && startPractice(selectedTopicId, questionCount, isTimedMode)}
              >
                ¡Comenzar Ejercicios!
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // VISTA: FICHA TEÓRICA
  const renderTheory = () => (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-20 border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => setView('dashboard')} 
            className="text-slate-600 hover:text-indigo-600 flex items-center gap-2 font-bold text-base transition-colors"
          >
            <ChevronLeft size={22} /> Dashboard
          </button>
          <div className="text-center">
            <span className="text-xs font-black text-indigo-600 uppercase tracking-widest block">
              3º ESO · Ficha Teórica
            </span>
            <h1 className="font-extrabold text-xl text-slate-900 truncate max-w-sm">
              {theory?.title}
            </h1>
          </div>
          <Button 
            size="sm" 
            variant="primary" 
            onClick={() => selectedTopicId && startPractice(selectedTopicId, 10)}
          >
            Practicar
          </Button>
        </div>
      </header>

      <div className="flex-1 p-6 md:p-10">
        <div className="max-w-3xl mx-auto">
          <div 
            className="prose prose-slate max-w-none prose-headings:font-black prose-headings:text-slate-900" 
            dangerouslySetInnerHTML={{ __html: theory?.htmlContent || "" }} 
          />

          <div className="mt-10 p-8 rounded-3xl bg-indigo-600 text-white text-center flex flex-col items-center">
            <h3 className="text-2xl font-black mb-2">¿Listo para poner a prueba lo aprendido?</h3>
            <p className="text-indigo-100 text-sm mb-6 max-w-md">
              Comprueba si dominas estas estructuras con preguntas de examen de 3º ESO.
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => selectedTopicId && startPractice(selectedTopicId, 10)}
            >
              Comenzar Práctica (10 preguntas)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // VISTA: QUIZ / EJERCICIOS INTERACTIVOS
  const renderQuiz = () => {
    if (!session) return null;
    const question = session.questions[session.currentIndex];
    const progress = ((session.currentIndex) / session.questions.length) * 100;
    
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        {/* Barra superior de progreso */}
        <nav className="bg-white px-6 py-4 flex items-center justify-between border-b border-slate-200 z-20">
          <button 
            onClick={() => setView('dashboard')} 
            className="text-slate-400 hover:text-slate-700 transition-colors p-2"
            title="Salir"
          >
            <XCircle size={28} />
          </button>

          <div className="flex-1 max-w-md mx-6">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                Pregunta {session.currentIndex + 1} de {session.questions.length}
              </span>
              {session.isTimed && (
                <div className={`flex items-center gap-1.5 text-xs font-black tabular-nums ${timerSeconds <= 10 ? 'text-rose-600 animate-pulse' : 'text-slate-600'}`}>
                  <Clock size={14} />
                  <span>{timerSeconds}s</span>
                </div>
              )}
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div 
                className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-black text-sm">
              <Zap size={16} className="text-amber-500" />
              <span className="tabular-nums">{session.score}</span>
            </div>
          </div>
        </nav>

        {/* Cuerpo del ejercicio */}
        <div className="flex-1 flex items-center justify-center p-6 md:p-12 pb-36">
          <div className="w-full max-w-2xl">
            {/* Cabecera del tipo de ejercicio */}
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                  {question.type === QuestionType.SENTENCE_TRANSFORMATION && "Reescritura de oraciones (Sentence Transformation)"}
                  {question.type === QuestionType.FILL_BLANK && "Completa el hueco con la forma adecuada"}
                  {question.type === QuestionType.MULTIPLE_CHOICE && "Elige la opción correcta"}
                </span>
                {(() => {
                  const qDiff = question.difficulty ?? session.difficultyLevel ?? difficulty;
                  const dInfo = getDifficultyInfo(qDiff);
                  return (
                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border ${dInfo.badgeBg} ${dInfo.badgeBorder}`}>
                      🎯 Dificultad {qDiff}/10: {dInfo.label}
                    </span>
                  );
                })()}
              </div>

              {question.hint && (
                <button
                  onClick={() => setShowHint(prev => !prev)}
                  className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  <HelpCircle size={15} />
                  {showHint ? "Ocultar pista" : "Ver pista"}
                </button>
              )}
            </div>

            {showHint && question.hint && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold mb-4 animate-in fade-in">
                💡 <strong>Pista de examen:</strong> {question.hint}
              </div>
            )}

            {/* Tarjeta de Enunciado */}
            <div className="bg-white rounded-3xl border-2 border-slate-100 p-8 md:p-10 mb-8 shadow-sm">
              {/* Si es Sentence Transformation, mostrar frase original y keyword */}
              {question.type === QuestionType.SENTENCE_TRANSFORMATION && (
                <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest block mb-1">
                    Oración Original
                  </span>
                  <p className="text-xl font-bold text-slate-800 italic">
                    "{question.originalSentence}"
                  </p>
                  {question.keyWord && (
                    <div className="mt-3 inline-flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">Palabra clave obligatoria:</span>
                      <span className="px-2.5 py-1 bg-indigo-600 text-white font-mono font-black text-xs rounded-md">
                        {question.keyWord}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Texto principal con hueco */}
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-relaxed">
                {question.text.split('_______').map((part, i, arr) => (
                  <React.Fragment key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <span className={`inline-block min-w-[140px] border-b-4 mx-2 px-3 py-0.5 font-bold transition-all rounded-t-lg ${
                        showFeedback !== 'none' 
                          ? 'text-indigo-700 border-indigo-500 bg-indigo-50' 
                          : 'text-indigo-600 border-slate-300 bg-slate-50'
                      }`}>
                        {showFeedback !== 'none' ? question.correctAnswer : (userAnswer || '...')}
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </h2>
            </div>

            {/* Área de Respuesta según el tipo */}
            {question.type === QuestionType.MULTIPLE_CHOICE ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {question.options?.map((opt, i) => {
                  let btnState = "bg-white border-2 border-slate-200 text-slate-800 hover:border-indigo-400 hover:bg-indigo-50/30";
                  if (showFeedback !== 'none') {
                    if (opt === question.correctAnswer) {
                      btnState = "bg-emerald-50 border-2 border-emerald-500 text-emerald-800 font-extrabold";
                    } else if (opt === userAnswer) {
                      btnState = "bg-rose-50 border-2 border-rose-500 text-rose-800 opacity-70";
                    } else {
                      btnState = "opacity-30 border-slate-100 bg-white pointer-events-none";
                    }
                  }

                  return (
                    <button 
                      key={i} 
                      disabled={showFeedback !== 'none'} 
                      onClick={() => { setUserAnswer(opt); handleAnswerSubmit(opt); }}
                      className={`p-5 rounded-2xl text-left font-bold text-lg transition-all active:scale-[0.98] flex items-center gap-3 ${btnState}`}
                    >
                      <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1">{opt}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="w-full">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="text" 
                    disabled={showFeedback !== 'none'} 
                    value={userAnswer} 
                    onChange={(e) => setUserAnswer(e.target.value)} 
                    placeholder="Escribe la respuesta aquí..."
                    className="flex-1 p-4 text-xl font-bold text-slate-900 bg-white border-2 border-slate-200 rounded-2xl focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100 shadow-sm"
                    onKeyDown={(e) => e.key === 'Enter' && userAnswer.trim() && handleAnswerSubmit(userAnswer)}
                    autoFocus
                  />
                  {showFeedback === 'none' && (
                    <Button 
                      size="md" 
                      variant="primary" 
                      onClick={() => handleAnswerSubmit(userAnswer)} 
                      disabled={!userAnswer.trim()}
                      className="px-8 py-4 text-base"
                    >
                      Comprobar
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cortina de Feedback Inferior */}
        <div className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ${
          showFeedback !== 'none' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}>
          <div className="max-w-4xl mx-auto px-4 pb-4">
            <div className={`p-6 md:p-8 rounded-3xl shadow-2xl border-t-4 bg-white ${
              showFeedback === 'correct' ? 'border-emerald-500' : 'border-rose-500'
            }`}>
              <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-2xl shrink-0 ${
                    showFeedback === 'correct' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {showFeedback === 'correct' ? <CheckCircle2 size={36} /> : <XCircle size={36} />}
                  </div>

                  <div>
                    <h3 className={`text-2xl font-black mb-1 ${
                      showFeedback === 'correct' ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {showFeedback === 'correct' ? '¡Respuesta Correcta!' : '¡Buen intento! Repasemos la regla'}
                    </h3>

                    {showFeedback === 'incorrect' && (
                      <div className="text-base text-slate-700 font-semibold mb-2">
                        Solución esperada: <span className="font-extrabold text-emerald-700">{question.correctAnswer}</span>
                      </div>
                    )}

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 text-sm leading-relaxed mt-2">
                      <span className="font-black text-slate-400 text-[10px] uppercase tracking-wider block mb-1">
                        ¿Por qué es así en 3º ESO?
                      </span>
                      {question.explanation}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 w-full md:w-auto">
                  <Button 
                    size="lg" 
                    variant={showFeedback === 'correct' ? 'secondary' : 'danger'} 
                    onClick={handleNextQuestion}
                    className="w-full md:w-auto px-8"
                  >
                    Siguiente Ejercicio <ArrowRight size={18} className="ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // VISTA: PANTALLA DE CARGA
  const renderLoading = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
          <BookOpen size={32} />
        </div>
      </div>
      <h2 className="text-3xl font-extrabold text-slate-900 mb-2 text-center">{loadingMessage}</h2>
      <p className="text-slate-400 text-center max-w-sm text-sm">
        Calibrando las preguntas al nivel y requisitos de 3º de la ESO...
      </p>
    </div>
  );

  // VISTA: RESULTADOS
  const renderResults = () => {
    if (!session) return null;
    const correctCount = session.history.filter(Boolean).length;
    const totalCount = session.questions.length;
    const percentage = Math.round((correctCount / totalCount) * 100);
    const isPass = percentage >= 50;

    return (
      <div className="min-h-screen p-6 md:p-12 bg-slate-50 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white p-8 md:p-12 rounded-[3rem] shadow-sm border-2 border-slate-100">
          <div className="text-center mb-8">
            <div className={`inline-flex p-5 rounded-3xl mb-4 ${
              isPass ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-slate-100 text-slate-500'
            }`}>
              <Trophy size={64} />
            </div>
            <h2 className="text-4xl font-extrabold text-slate-900 mb-2">
              {percentage >= 90 ? '¡Sobresaliente! 🌟' : isPass ? '¡Buen trabajo! Superado' : 'A seguir practicando'}
            </h2>
            <p className="text-slate-500 text-lg">
              Has acertado <strong className="text-slate-900">{correctCount}</strong> de <strong className="text-slate-900">{totalCount}</strong> ejercicios ({percentage}%)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 text-center">
              <span className="text-xs font-black uppercase tracking-wider text-amber-700 block mb-1">XP Ganados</span>
              <span className="text-3xl font-black text-amber-900">+{session.score}</span>
            </div>
            <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 text-center">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-700 block mb-1">Nota Estimada</span>
              <span className="text-3xl font-black text-indigo-900">{(percentage / 10).toFixed(1)}/10</span>
            </div>
            {(() => {
              const resDiff = session.difficultyLevel ?? difficulty;
              const dInfo = getDifficultyInfo(resDiff);
              return (
                <div className={`p-6 rounded-2xl border text-center ${dInfo.badgeBg} ${dInfo.badgeBorder}`}>
                  <span className="text-xs font-black uppercase tracking-wider block mb-1 opacity-80">Dificultad</span>
                  <span className="text-3xl font-black block">{resDiff}/10</span>
                  <span className="text-xs font-bold opacity-90 truncate block mt-0.5">{dInfo.label}</span>
                </div>
              );
            })()}
          </div>

          {/* Desglose de preguntas para revisión */}
          <div className="mb-8">
            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-3">
              Revisión de Ejercicios
            </h4>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {session.userAnswers.map((ua, i) => (
                <div 
                  key={i} 
                  className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
                    ua.isCorrect ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'
                  }`}
                >
                  <div className="mt-0.5">
                    {ua.isCorrect ? (
                      <CheckCircle2 size={18} className="text-emerald-600" />
                    ) : (
                      <XCircle size={18} className="text-rose-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 mb-1">{ua.questionText}</p>
                    {!ua.isCorrect && (
                      <p className="text-xs text-rose-700">
                        Tu respuesta: <span className="line-through">{ua.userAnswer}</span> · Correcta: <strong className="text-emerald-700">{ua.correctAnswer}</strong>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={() => selectedTopicId && startPractice(selectedTopicId, session.questions.length, session.isTimed)}
              className="flex-1 py-4"
            >
              Repetir Práctica
            </Button>
            <Button 
              variant="primary" 
              onClick={() => setView('dashboard')}
              className="flex-1 py-4"
            >
              Volver al Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100">
      {showConfigModal && renderConfigModal()}
      <main>
        {view === 'dashboard' && renderDashboard()}
        {view === 'upload_pages' && renderUploadPages()}
        {view === 'loading' && renderLoading()}
        {view === 'theory' && renderTheory()}
        {view === 'quiz' && renderQuiz()}
        {view === 'results' && renderResults()}
      </main>
    </div>
  );
}
