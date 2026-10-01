export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  FILL_BLANK = 'fill_blank',
  SENTENCE_TRANSFORMATION = 'sentence_transformation',
}

export interface Question {
  id: string;
  text: string; // The exercise prompt or sentence with blanks
  type: QuestionType;
  options?: string[]; // 4 options for multiple choice
  correctAnswer: string;
  acceptableAnswers?: string[]; // Alternative valid spellings/contractions (e.g., "haven't seen" vs "have not seen")
  explanation: string; // Pedagogical explanation in Spanish with English grammar rules
  hint?: string; // Quick tip or clue
  originalSentence?: string; // For sentence transformations (e.g., "I haven't visited London before.")
  keyWord?: string; // For sentence transformations (e.g., "FIRST" -> "It is the FIRST time I have visited London.")
  difficulty?: number; // Difficulty scale from 0 (minimum) to 10 (maximum)
}

export interface QuizSession {
  topicId: string;
  topicTitle: string;
  questions: Question[];
  currentIndex: number;
  score: number;
  streak: number;
  history: boolean[]; // track correct/incorrect
  userAnswers: {
    questionId: string;
    questionText: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
  }[];
  isTimed?: boolean;
  timeRemaining?: number;
  difficultyLevel?: number; // Selected difficulty level (0 to 10)
}

export interface Topic {
  id: string;
  title: string;
  unitCode?: string; // e.g., "Unit 1", "Grammar 3"
  description: string;
  icon: string;
  color: string;
  systemPromptContext: string;
  isCustomFromPhoto?: boolean;
  extractedFromPageCount?: number;
  sampleKeywords?: string[];
}

export interface TheoryContent {
  title: string;
  htmlContent: string; // Visual Tailwind HTML cheat sheet
  summarySpanish?: string;
  rules?: { title: string; explanation: string; example: string }[];
}

export interface UploadedPage {
  id: string;
  name: string;
  dataUrl: string;
  timestamp: number;
  size: number;
}