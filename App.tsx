/**
 * UWtopia Rx V5 - Production Medical Quiz Application
 * 
 * FEATURES:
 * V5 NEW: Global Search, Dark Mode, Font Control, Custom Quiz Builder, 
 *         Backup/Export, HTML Rendering, Fixed Timer Presets
 * V4 RETAINED: Session Recovery, Answer Locking, Timer Persistence,
 *             Android BackHandler, Category Analytics
 * 
 * Total Questions: 1005 across 19 medical categories
 * Version: 5.0.0
 * Build: Production-Ready
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  BackHandler,
  TextInput,
  Modal,
  FlatList,
  Switch,
  Platform,
  useColorScheme,
  Share,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import RenderHTML from 'react-native-render-html';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: string;
}

interface QuizSession {
  questions: Question[];
  currentIndex: number;
  answers: (number | null)[];
  startTime: number;
  questionStartTime: number;
  timerDuration: number | null;
  timerRemaining: number | null;
  studyMode: StudyMode;
  selectedCategory: string;
  isLocked: boolean[];
}

interface Attempt {
  questionId: number;
  selectedAnswer: number;
  isCorrect: boolean;
  timestamp: number;
  timeSpent: number;
}

interface CategoryStats {
  total: number;
  correct: number;
  incorrect: number;
  untaken: number;
}

interface CustomQuiz {
  id: string;
  name: string;
  questionIds: number[];
  createdAt: number;
}

type StudyMode = 'all' | 'incorrect' | 'untaken' | 'correct';
type Screen = 'home' | 'quiz' | 'results' | 'settings' | 'customQuiz';
type FontSize = 'small' | 'medium' | 'large';
type TimerPreset = 5 | 10 | 20 | 30;

// ============================================================================
// THEME CONFIGURATION
// ============================================================================

const themes = {
  light: {
    primary: '#1A365D',      // Medical Blue
    background: '#FFFFFF',
    card: '#F7FAFC',
    text: '#1A202C',
    textSecondary: '#718096',
    border: '#E2E8F0',
    success: '#38A169',
    error: '#E53E3E',
    warning: '#DD6B20',
    info: '#3182CE',
    disabled: '#CBD5E0',
  },
  dark: {
    primary: '#4299E1',      // Sky Blue
    background: '#1A202C',
    card: '#2D3748',
    text: '#F7FAFC',
    textSecondary: '#A0AEC0',
    border: '#4A5568',
    success: '#48BB78',
    error: '#FC8181',
    warning: '#F6AD55',
    info: '#63B3ED',
    disabled: '#4A5568',
  },
};

const fontSizes = {
  small: {
    tiny: 10,
    small: 12,
    regular: 14,
    medium: 16,
    large: 18,
    xlarge: 20,
    xxlarge: 24,
  },
  medium: {
    tiny: 12,
    small: 14,
    regular: 16,
    medium: 18,
    large: 20,
    xlarge: 22,
    xxlarge: 28,
  },
  large: {
    tiny: 14,
    small: 16,
    regular: 18,
    medium: 20,
    large: 22,
    xlarge: 24,
    xxlarge: 32,
  },
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

export default function App() {
  // -------------------------------------------------------------------------
  // STATE MANAGEMENT
  // -------------------------------------------------------------------------
  
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(systemColorScheme === 'dark');
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [customQuizzes, setCustomQuizzes] = useState<CustomQuiz[]>([]);
  const [showCustomQuizBuilder, setShowCustomQuizBuilder] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  const [newQuizName, setNewQuizName] = useState('');
  
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const theme = themes[isDarkMode ? 'dark' : 'light'];
  const fonts = fontSizes[fontSize];
  const screenWidth = Dimensions.get('window').width;

  // -------------------------------------------------------------------------
  // INITIALIZATION
  // -------------------------------------------------------------------------

  useEffect(() => {
    initializeApp();
    return cleanup;
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize database
      const database = await SQLite.openDatabaseAsync('uwtopia.db');
      setDb(database);
      await initializeDatabase(database);

      // Load questions
      const questions = await loadQuestions();
      setAllQuestions(questions);

      // Load preferences
      await loadPreferences();

      // Load custom quizzes
      await loadCustomQuizzes();

      // Attempt session recovery
      await recoverSession(database, questions);
    } catch (error) {
      console.error('Initialization error:', error);
      Alert.alert('Error', 'Failed to initialize app. Please restart.');
    }
  };

  const initializeDatabase = async (database: SQLite.SQLiteDatabase) => {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER NOT NULL,
        selected_answer INTEGER NOT NULL,
        is_correct INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        time_spent INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_question_id ON attempts(question_id);
      CREATE INDEX IF NOT EXISTS idx_timestamp ON attempts(timestamp);
      CREATE INDEX IF NOT EXISTS idx_is_correct ON attempts(is_correct);
    `);
  };

  const loadQuestions = async (): Promise<Question[]> => {
    try {
      const questionsData = require('./assets/uwtopia_rx_questions.json');
      return questionsData;
    } catch (error) {
      console.error('Error loading questions:', error);
      Alert.alert('Error', 'Failed to load questions. Please reinstall the app.');
      return [];
    }
  };

  const loadPreferences = async () => {
    try {
      const savedDarkMode = await AsyncStorage.getItem('darkMode');
      const savedFontSize = await AsyncStorage.getItem('fontSize');
      
      if (savedDarkMode !== null) {
        setIsDarkMode(savedDarkMode === 'true');
      }
      if (savedFontSize !== null) {
        setFontSize(savedFontSize as FontSize);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const loadCustomQuizzes = async () => {
    try {
      const saved = await AsyncStorage.getItem('customQuizzes');
      if (saved) {
        setCustomQuizzes(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading custom quizzes:', error);
    }
  };

  const recoverSession = async (database: SQLite.SQLiteDatabase, questions: Question[]) => {
    try {
      const savedSession = await AsyncStorage.getItem('activeSession');
      if (savedSession) {
        const recovered: QuizSession = JSON.parse(savedSession);
        
        // Validate recovered session
        if (recovered.questions && recovered.questions.length > 0) {
          setSession(recovered);
          setCurrentScreen('quiz');
          
          // Resume timer if applicable
          if (recovered.timerRemaining !== null && recovered.timerRemaining > 0) {
            startTimer(recovered.timerRemaining);
          }
        }
      }
    } catch (error) {
      console.error('Session recovery error:', error);
    }
  };

  const cleanup = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
  };

  // -------------------------------------------------------------------------
  // ANDROID BACK HANDLER
  // -------------------------------------------------------------------------

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentScreen === 'quiz') {
        Alert.alert(
          'Exit Quiz',
          'Are you sure you want to exit? Your progress will be saved.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Exit', onPress: () => setCurrentScreen('home') },
          ]
        );
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [currentScreen]);

  // -------------------------------------------------------------------------
  // SESSION MANAGEMENT
  // -------------------------------------------------------------------------

  const saveSession = useCallback(async (sessionData: QuizSession) => {
    try {
      await AsyncStorage.setItem('activeSession', JSON.stringify(sessionData));
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }, []);

  useEffect(() => {
    if (session) {
      saveSession(session);
    }
  }, [session, saveSession]);

  // -------------------------------------------------------------------------
  // QUIZ LOGIC
  // -------------------------------------------------------------------------

  const startQuiz = async (
    mode: StudyMode,
    category: string,
    timerMinutes: number | null,
    customQuizId?: string
  ) => {
    try {
      let quizQuestions: Question[];

      if (customQuizId) {
        const quiz = customQuizzes.find(q => q.id === customQuizId);
        if (!quiz) {
          Alert.alert('Error', 'Custom quiz not found');
          return;
        }
        quizQuestions = allQuestions.filter(q => quiz.questionIds.includes(q.id));
      } else {
        quizQuestions = await filterQuestionsByMode(mode, category);
      }

      if (quizQuestions.length === 0) {
        Alert.alert('No Questions', 'No questions available for the selected criteria.');
        return;
      }

      // Shuffle questions
      const shuffled = [...quizQuestions].sort(() => Math.random() - 0.5);

      const newSession: QuizSession = {
        questions: shuffled,
        currentIndex: 0,
        answers: new Array(shuffled.length).fill(null),
        startTime: Date.now(),
        questionStartTime: Date.now(),
        timerDuration: timerMinutes ? timerMinutes * 60 : null,
        timerRemaining: timerMinutes ? timerMinutes * 60 : null,
        studyMode: mode,
        selectedCategory: category,
        isLocked: new Array(shuffled.length).fill(false),
      };

      setSession(newSession);
      setCurrentScreen('quiz');

      if (timerMinutes) {
        startTimer(timerMinutes * 60);
      }
    } catch (error) {
      console.error('Error starting quiz:', error);
      Alert.alert('Error', 'Failed to start quiz. Please try again.');
    }
  };

  const filterQuestionsByMode = async (mode: StudyMode, category: string): Promise<Question[]> => {
    let filtered = category === 'All' 
      ? allQuestions 
      : allQuestions.filter(q => q.category === category);

    if (mode === 'all') {
      return filtered;
    }

    if (!db) return filtered;

    try {
      const attempts = await db.getAllAsync<Attempt>('SELECT * FROM attempts');
      
      const questionAttempts = new Map<number, Attempt[]>();
      attempts.forEach(attempt => {
        if (!questionAttempts.has(attempt.questionId)) {
          questionAttempts.set(attempt.questionId, []);
        }
        questionAttempts.get(attempt.questionId)!.push(attempt);
      });

      return filtered.filter(q => {
        const qAttempts = questionAttempts.get(q.id) || [];
        
        if (mode === 'untaken') {
          return qAttempts.length === 0;
        } else if (mode === 'correct') {
          return qAttempts.some(a => a.isCorrect);
        } else if (mode === 'incorrect') {
          return qAttempts.length > 0 && qAttempts.every(a => !a.isCorrect);
        }
        
        return false;
      });
    } catch (error) {
      console.error('Error filtering questions:', error);
      return filtered;
    }
  };

  const startTimer = (seconds: number) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    timerIntervalRef.current = setInterval(() => {
      setSession(prev => {
        if (!prev || prev.timerRemaining === null) return prev;
        
        const newRemaining = prev.timerRemaining - 1;
        
        if (newRemaining <= 0) {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
          }
          finishQuiz();
          return prev;
        }
        
        return { ...prev, timerRemaining: newRemaining };
      });
    }, 1000);
  };

  const selectAnswer = (answerIndex: number) => {
    if (!session) return;

    const { currentIndex, isLocked } = session;
    
    if (isLocked[currentIndex]) {
      Alert.alert('Answer Locked', 'You have already submitted this answer.');
      return;
    }

    setSession(prev => {
      if (!prev) return prev;
      const newAnswers = [...prev.answers];
      newAnswers[currentIndex] = answerIndex;
      return { ...prev, answers: newAnswers };
    });
  };

  const submitAnswer = async () => {
    if (!session || !db) return;

    const { currentIndex, answers, questions, isLocked } = session;
    const selectedAnswer = answers[currentIndex];

    if (selectedAnswer === null) {
      Alert.alert('No Answer', 'Please select an answer before submitting.');
      return;
    }

    if (isLocked[currentIndex]) {
      Alert.alert('Answer Locked', 'You have already submitted this answer.');
      return;
    }

    const question = questions[currentIndex];
    const isCorrect = selectedAnswer === question.correctAnswer;
    const timeSpent = Math.floor((Date.now() - session.questionStartTime) / 1000);

    try {
      // Save attempt to database
      await db.runAsync(
        'INSERT INTO attempts (question_id, selected_answer, is_correct, timestamp, time_spent) VALUES (?, ?, ?, ?, ?)',
        [question.id, selectedAnswer, isCorrect ? 1 : 0, Date.now(), timeSpent]
      );

      // Lock the answer
      setSession(prev => {
        if (!prev) return prev;
        const newLocked = [...prev.isLocked];
        newLocked[currentIndex] = true;
        return { ...prev, isLocked: newLocked };
      });

      Alert.alert(
        isCorrect ? '✅ Correct!' : '❌ Incorrect',
        isCorrect ? 'Well done!' : `Correct answer: ${question.options[question.correctAnswer]}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving attempt:', error);
      Alert.alert('Error', 'Failed to save your answer. Please try again.');
    }
  };

  const nextQuestion = () => {
    if (!session) return;

    if (session.currentIndex < session.questions.length - 1) {
      setSession(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          currentIndex: prev.currentIndex + 1,
          questionStartTime: Date.now(),
        };
      });
    } else {
      finishQuiz();
    }
  };

  const previousQuestion = () => {
    if (!session) return;

    if (session.currentIndex > 0) {
      setSession(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          currentIndex: prev.currentIndex - 1,
          questionStartTime: Date.now(),
        };
      });
    }
  };

  const finishQuiz = async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    await AsyncStorage.removeItem('activeSession');
    setCurrentScreen('results');
  };

  // -------------------------------------------------------------------------
  // STATISTICS
  // -------------------------------------------------------------------------

  const getOverallStats = async () => {
    if (!db) return { total: 0, correct: 0, incorrect: 0, untaken: 0 };

    try {
      const attempts = await db.getAllAsync<Attempt>('SELECT * FROM attempts');
      
      const questionAttempts = new Map<number, Attempt[]>();
      attempts.forEach(attempt => {
        if (!questionAttempts.has(attempt.questionId)) {
          questionAttempts.set(attempt.questionId, []);
        }
        questionAttempts.get(attempt.questionId)!.push(attempt);
      });

      let correct = 0;
      let incorrect = 0;
      let untaken = 0;

      allQuestions.forEach(q => {
        const qAttempts = questionAttempts.get(q.id) || [];
        
        if (qAttempts.length === 0) {
          untaken++;
        } else if (qAttempts.some(a => a.isCorrect)) {
          correct++;
        } else {
          incorrect++;
        }
      });

      return {
        total: allQuestions.length,
        correct,
        incorrect,
        untaken,
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { total: 0, correct: 0, incorrect: 0, untaken: 0 };
    }
  };

  const getCategoryStats = async (): Promise<Map<string, CategoryStats>> => {
    if (!db) return new Map();

    try {
      const attempts = await db.getAllAsync<Attempt>('SELECT * FROM attempts');
      
      const questionAttempts = new Map<number, Attempt[]>();
      attempts.forEach(attempt => {
        if (!questionAttempts.has(attempt.questionId)) {
          questionAttempts.set(attempt.questionId, []);
        }
        questionAttempts.get(attempt.questionId)!.push(attempt);
      });

      const categoryStats = new Map<string, CategoryStats>();

      allQuestions.forEach(q => {
        if (!categoryStats.has(q.category)) {
          categoryStats.set(q.category, {
            total: 0,
            correct: 0,
            incorrect: 0,
            untaken: 0,
          });
        }

        const stats = categoryStats.get(q.category)!;
        stats.total++;

        const qAttempts = questionAttempts.get(q.id) || [];
        
        if (qAttempts.length === 0) {
          stats.untaken++;
        } else if (qAttempts.some(a => a.isCorrect)) {
          stats.correct++;
        } else {
          stats.incorrect++;
        }
      });

      return categoryStats;
    } catch (error) {
      console.error('Error getting category stats:', error);
      return new Map();
    }
  };

  // -------------------------------------------------------------------------
  // CUSTOM QUIZ BUILDER
  // -------------------------------------------------------------------------

  const saveCustomQuiz = async () => {
    if (!newQuizName.trim()) {
      Alert.alert('Error', 'Please enter a quiz name');
      return;
    }

    if (selectedQuestions.size === 0) {
      Alert.alert('Error', 'Please select at least one question');
      return;
    }

    const newQuiz: CustomQuiz = {
      id: Date.now().toString(),
      name: newQuizName.trim(),
      questionIds: Array.from(selectedQuestions),
      createdAt: Date.now(),
    };

    const updated = [...customQuizzes, newQuiz];
    setCustomQuizzes(updated);
    
    try {
      await AsyncStorage.setItem('customQuizzes', JSON.stringify(updated));
      Alert.alert('Success', `Quiz "${newQuiz.name}" created with ${newQuiz.questionIds.length} questions`);
      
      setShowCustomQuizBuilder(false);
      setNewQuizName('');
      setSelectedQuestions(new Set());
    } catch (error) {
      console.error('Error saving custom quiz:', error);
      Alert.alert('Error', 'Failed to save quiz. Please try again.');
    }
  };

  const deleteCustomQuiz = async (quizId: string) => {
    Alert.alert(
      'Delete Quiz',
      'Are you sure you want to delete this quiz?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = customQuizzes.filter(q => q.id !== quizId);
            setCustomQuizzes(updated);
            try {
              await AsyncStorage.setItem('customQuizzes', JSON.stringify(updated));
            } catch (error) {
              console.error('Error deleting quiz:', error);
            }
          },
        },
      ]
    );
  };

  // -------------------------------------------------------------------------
  // BACKUP & EXPORT
  // -------------------------------------------------------------------------

  const exportData = async () => {
    try {
      if (!db) {
        Alert.alert('Error', 'Database not initialized');
        return;
      }

      const attempts = await db.getAllAsync<Attempt>('SELECT * FROM attempts');
      const preferences = {
        darkMode: isDarkMode,
        fontSize,
      };

      const exportData = {
        version: '5.0.0',
        exportDate: new Date().toISOString(),
        attempts,
        customQuizzes,
        preferences,
        stats: await getOverallStats(),
      };

      const fileName = `uwtopia_backup_${Date.now()}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(exportData, null, 2)
      );

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export UWtopia Data',
        });
      } else {
        Alert.alert('Success', `Data exported to ${fileName}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export data. Please try again.');
    }
  };

  // -------------------------------------------------------------------------
  // PREFERENCES
  // -------------------------------------------------------------------------

  const toggleDarkMode = async () => {
    const newValue = !isDarkMode;
    setIsDarkMode(newValue);
    try {
      await AsyncStorage.setItem('darkMode', newValue.toString());
    } catch (error) {
      console.error('Error saving dark mode preference:', error);
    }
  };

  const changeFontSize = async (size: FontSize) => {
    setFontSize(size);
    try {
      await AsyncStorage.setItem('fontSize', size);
    } catch (error) {
      console.error('Error saving font size preference:', error);
    }
  };

  // -------------------------------------------------------------------------
  // SEARCH & FILTER
  // -------------------------------------------------------------------------

  const getFilteredQuestions = () => {
    if (!searchQuery.trim()) return allQuestions;

    const query = searchQuery.toLowerCase();
    return allQuestions.filter(q =>
      q.question.toLowerCase().includes(query) ||
      q.explanation.toLowerCase().includes(query) ||
      q.category.toLowerCase().includes(query) ||
      q.options.some(opt => opt.toLowerCase().includes(query))
    );
  };

  // -------------------------------------------------------------------------
  // RENDER FUNCTIONS
  // -------------------------------------------------------------------------

  const renderHome = () => {
    const [stats, setStats] = useState<CategoryStats>({ total: 0, correct: 0, incorrect: 0, untaken: 0 });
    const [selectedMode, setSelectedMode] = useState<StudyMode>('all');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [timerEnabled, setTimerEnabled] = useState(false);
    const [selectedTimer, setSelectedTimer] = useState<TimerPreset>(5);

    useEffect(() => {
      getOverallStats().then(setStats);
    }, []);

    const categories = ['All', ...Array.from(new Set(allQuestions.map(q => q.category)))];
    const timerPresets: TimerPreset[] = [5, 10, 20, 30];

    return (
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <Text style={[styles.headerTitle, { fontSize: fonts.xxlarge, color: '#FFFFFF' }]}>
            UWtopia Rx V5
          </Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setCurrentScreen('settings')}
          >
            <Text style={{ fontSize: fonts.large, color: '#FFFFFF' }}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Global Search */}
        <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TextInput
            style={[styles.searchInput, { fontSize: fonts.regular, color: theme.text }]}
            placeholder="🔍 Search questions..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={{ fontSize: fonts.medium, color: theme.primary }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Progress Overview */}
        <View style={[styles.statsCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.statsTitle, { fontSize: fonts.large, color: theme.text }]}>
            Progress Overview
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { fontSize: fonts.xxlarge, color: theme.success }]}>
                {stats.correct}
              </Text>
              <Text style={[styles.statLabel, { fontSize: fonts.small, color: theme.textSecondary }]}>
                Correct
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { fontSize: fonts.xxlarge, color: theme.error }]}>
                {stats.incorrect}
              </Text>
              <Text style={[styles.statLabel, { fontSize: fonts.small, color: theme.textSecondary }]}>
                Incorrect
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { fontSize: fonts.xxlarge, color: theme.warning }]}>
                {stats.untaken}
              </Text>
              <Text style={[styles.statLabel, { fontSize: fonts.small, color: theme.textSecondary }]}>
                Untaken
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { fontSize: fonts.xxlarge, color: theme.text }]}>
                {Math.floor((stats.correct / stats.total) * 100) || 0}%
              </Text>
              <Text style={[styles.statLabel, { fontSize: fonts.small, color: theme.textSecondary }]}>
                Avg Score
              </Text>
            </View>
          </View>
        </View>

        {/* Study Mode Selection */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { fontSize: fonts.large, color: theme.text }]}>
            Study Mode
          </Text>
          <View style={styles.modeGrid}>
            {(['all', 'incorrect', 'untaken', 'correct'] as StudyMode[]).map(mode => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeButton,
                  selectedMode === mode && { backgroundColor: theme.primary },
                  { borderColor: theme.border }
                ]}
                onPress={() => setSelectedMode(mode)}
              >
                <Text style={[
                  styles.modeButtonText,
                  { fontSize: fonts.medium },
                  selectedMode === mode ? { color: '#FFFFFF' } : { color: theme.text }
                ]}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Category Selection */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { fontSize: fonts.large, color: theme.text }]}>
            Category
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoryRow}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    selectedCategory === cat && { backgroundColor: theme.primary },
                    { borderColor: theme.border }
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    { fontSize: fonts.small },
                    selectedCategory === cat ? { color: '#FFFFFF' } : { color: theme.text }
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Timer Configuration */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.timerHeader}>
            <Text style={[styles.sectionTitle, { fontSize: fonts.large, color: theme.text }]}>
              Timer
            </Text>
            <Switch
              value={timerEnabled}
              onValueChange={setTimerEnabled}
              trackColor={{ false: theme.disabled, true: theme.primary }}
              thumbColor={timerEnabled ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>
          {timerEnabled && (
            <View style={styles.timerPresets}>
              {timerPresets.map(minutes => (
                <TouchableOpacity
                  key={minutes}
                  style={[
                    styles.timerButton,
                    selectedTimer === minutes && { backgroundColor: theme.primary },
                    { borderColor: theme.border }
                  ]}
                  onPress={() => setSelectedTimer(minutes)}
                >
                  <Text style={[
                    styles.timerButtonText,
                    { fontSize: fonts.medium },
                    selectedTimer === minutes ? { color: '#FFFFFF' } : { color: theme.text }
                  ]}>
                    {minutes} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Start Quiz Button */}
        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: theme.primary }]}
          onPress={() => startQuiz(selectedMode, selectedCategory, timerEnabled ? selectedTimer : null)}
        >
          <Text style={[styles.startButtonText, { fontSize: fonts.large }]}>
            Start Quiz ({allQuestions.filter(q => selectedCategory === 'All' || q.category === selectedCategory).length} questions)
          </Text>
        </TouchableOpacity>

        {/* Custom Quiz Section */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { fontSize: fonts.large, color: theme.text }]}>
            Custom Quizzes
          </Text>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: theme.primary }]}
            onPress={() => setShowCustomQuizBuilder(true)}
          >
            <Text style={[styles.secondaryButtonText, { fontSize: fonts.medium, color: theme.primary }]}>
              + Create Custom Quiz
            </Text>
          </TouchableOpacity>
          
          {customQuizzes.map(quiz => (
            <View key={quiz.id} style={[styles.customQuizItem, { borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.customQuizName, { fontSize: fonts.medium, color: theme.text }]}>
                  {quiz.name}
                </Text>
                <Text style={[styles.customQuizInfo, { fontSize: fonts.small, color: theme.textSecondary }]}>
                  {quiz.questionIds.length} questions
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.quizStartButton, { backgroundColor: theme.primary }]}
                onPress={() => startQuiz('all', 'All', null, quiz.id)}
              >
                <Text style={[styles.quizStartButtonText, { fontSize: fonts.small }]}>Start</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quizDeleteButton}
                onPress={() => deleteCustomQuiz(quiz.id)}
              >
                <Text style={{ fontSize: fonts.small, color: theme.error }}>🗑️</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderQuiz = () => {
    if (!session) return null;

    const currentQuestion = session.questions[session.currentIndex];
    const selectedAnswer = session.answers[session.currentIndex];
    const isLocked = session.isLocked[session.currentIndex];
    const progress = ((session.currentIndex + 1) / session.questions.length) * 100;

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Quiz Header */}
        <View style={[styles.quizHeader, { backgroundColor: theme.primary }]}>
          <TouchableOpacity onPress={() => {
            Alert.alert(
              'Exit Quiz',
              'Your progress will be saved. Continue?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Exit', onPress: () => setCurrentScreen('home') },
              ]
            );
          }}>
            <Text style={{ fontSize: fonts.large, color: '#FFFFFF' }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[styles.quizProgress, { fontSize: fonts.small }]}>
              Question {session.currentIndex + 1} of {session.questions.length}
            </Text>
            {session.timerRemaining !== null && (
              <Text style={[styles.timerText, { fontSize: fonts.medium }]}>
                ⏱️ {formatTime(session.timerRemaining)}
              </Text>
            )}
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressBarContainer, { backgroundColor: theme.border }]}>
          <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: theme.success }]} />
        </View>

        <ScrollView style={styles.quizContent}>
          {/* Question */}
          <View style={[styles.questionCard, { backgroundColor: theme.card }]}>
            <View style={[styles.categoryBadge, { backgroundColor: theme.primary }]}>
              <Text style={[styles.categoryBadgeText, { fontSize: fonts.tiny }]}>
                {currentQuestion.category}
              </Text>
            </View>
            <RenderHTML
              contentWidth={screenWidth - 40}
              source={{ html: `<div style="color: ${theme.text}; font-size: ${fonts.regular}px;">${currentQuestion.question}</div>` }}
              baseStyle={{ color: theme.text }}
            />
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === currentQuestion.correctAnswer;
              const showCorrect = isLocked && isCorrect;
              const showIncorrect = isLocked && isSelected && !isCorrect;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    isSelected && !isLocked && { borderColor: theme.primary, borderWidth: 2 },
                    showCorrect && { backgroundColor: theme.success, borderColor: theme.success },
                    showIncorrect && { backgroundColor: theme.error, borderColor: theme.error },
                  ]}
                  onPress={() => selectAnswer(index)}
                  disabled={isLocked}
                >
                  <View style={styles.optionContent}>
                    <View style={[
                      styles.optionCircle,
                      { borderColor: theme.border },
                      isSelected && !isLocked && { borderColor: theme.primary, backgroundColor: theme.primary },
                      showCorrect && { borderColor: '#FFFFFF', backgroundColor: '#FFFFFF' },
                      showIncorrect && { borderColor: '#FFFFFF', backgroundColor: '#FFFFFF' },
                    ]}>
                      {isSelected && !isLocked && <View style={styles.optionCircleInner} />}
                      {showCorrect && <Text style={{ fontSize: fonts.tiny }}>✓</Text>}
                      {showIncorrect && <Text style={{ fontSize: fonts.tiny }}>✗</Text>}
                    </View>
                    <RenderHTML
                      contentWidth={screenWidth - 120}
                      source={{ html: `<div style="color: ${showCorrect || showIncorrect ? '#FFFFFF' : theme.text}; font-size: ${fonts.regular}px;">${option}</div>` }}
                      baseStyle={{ color: showCorrect || showIncorrect ? '#FFFFFF' : theme.text }}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Explanation (shown after locking) */}
          {isLocked && currentQuestion.explanation && (
            <View style={[styles.explanationCard, { backgroundColor: theme.info + '20', borderColor: theme.info }]}>
              <Text style={[styles.explanationTitle, { fontSize: fonts.medium, color: theme.info }]}>
                💡 Explanation
              </Text>
              <RenderHTML
                contentWidth={screenWidth - 40}
                source={{ html: `<div style="color: ${theme.text}; font-size: ${fonts.regular}px;">${currentQuestion.explanation}</div>` }}
                baseStyle={{ color: theme.text }}
              />
            </View>
          )}
        </ScrollView>

        {/* Quiz Footer */}
        <View style={[styles.quizFooter, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.navButton, { opacity: session.currentIndex === 0 ? 0.3 : 1 }]}
            onPress={previousQuestion}
            disabled={session.currentIndex === 0}
          >
            <Text style={[styles.navButtonText, { fontSize: fonts.medium, color: theme.primary }]}>
              ← Previous
            </Text>
          </TouchableOpacity>

          {!isLocked ? (
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.primary }]}
              onPress={submitAnswer}
            >
              <Text style={[styles.submitButtonText, { fontSize: fonts.medium }]}>
                Submit
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.success }]}
              onPress={nextQuestion}
            >
              <Text style={[styles.submitButtonText, { fontSize: fonts.medium }]}>
                {session.currentIndex === session.questions.length - 1 ? 'Finish' : 'Next →'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.navButton, { opacity: session.currentIndex === session.questions.length - 1 ? 0.3 : 1 }]}
            onPress={nextQuestion}
            disabled={session.currentIndex === session.questions.length - 1}
          >
            <Text style={[styles.navButtonText, { fontSize: fonts.medium, color: theme.primary }]}>
              Next →
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderResults = () => {
    if (!session) return null;

    const totalQuestions = session.questions.length;
    const answeredQuestions = session.answers.filter(a => a !== null).length;
    const correctAnswers = session.answers.filter((a, i) => a === session.questions[i].correctAnswer).length;
    const incorrectAnswers = answeredQuestions - correctAnswers;
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const totalTime = Math.floor((Date.now() - session.startTime) / 1000);

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    };

    return (
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <Text style={[styles.headerTitle, { fontSize: fonts.xxlarge, color: '#FFFFFF' }]}>
            Quiz Results
          </Text>
        </View>

        {/* Score Card */}
        <View style={[styles.scoreCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.scorePercentage, { fontSize: 72, color: score >= 70 ? theme.success : theme.error }]}>
            {score}%
          </Text>
          <Text style={[styles.scoreLabel, { fontSize: fonts.large, color: theme.textSecondary }]}>
            {score >= 90 ? 'Excellent!' : score >= 70 ? 'Good Job!' : score >= 50 ? 'Keep Practicing!' : 'Review Needed'}
          </Text>
        </View>

        {/* Results Summary */}
        <View style={[styles.resultsStats, { backgroundColor: theme.card }]}>
          <View style={styles.resultStatItem}>
            <Text style={[styles.resultStatNumber, { fontSize: fonts.xxlarge, color: theme.success }]}>
              {correctAnswers}
            </Text>
            <Text style={[styles.resultStatLabel, { fontSize: fonts.small, color: theme.textSecondary }]}>
              Correct
            </Text>
          </View>
          <View style={styles.resultStatItem}>
            <Text style={[styles.resultStatNumber, { fontSize: fonts.xxlarge, color: theme.error }]}>
              {incorrectAnswers}
            </Text>
            <Text style={[styles.resultStatLabel, { fontSize: fonts.small, color: theme.textSecondary }]}>
              Incorrect
            </Text>
          </View>
          <View style={styles.resultStatItem}>
            <Text style={[styles.resultStatNumber, { fontSize: fonts.xxlarge, color: theme.warning }]}>
              {totalQuestions - answeredQuestions}
            </Text>
            <Text style={[styles.resultStatLabel, { fontSize: fonts.small, color: theme.textSecondary }]}>
              Skipped
            </Text>
          </View>
          <View style={styles.resultStatItem}>
            <Text style={[styles.resultStatNumber, { fontSize: fonts.xxlarge, color: theme.info }]}>
              {formatTime(totalTime)}
            </Text>
            <Text style={[styles.resultStatLabel, { fontSize: fonts.small, color: theme.textSecondary }]}>
              Time
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          onPress={() => {
            setSession(null);
            setCurrentScreen('home');
          }}
        >
          <Text style={[styles.primaryButtonText, { fontSize: fonts.medium }]}>
            Back to Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: theme.primary }]}
          onPress={() => {
            startQuiz(session.studyMode, session.selectedCategory, session.timerDuration ? session.timerDuration / 60 : null);
          }}
        >
          <Text style={[styles.secondaryButtonText, { fontSize: fonts.medium, color: theme.primary }]}>
            Retry Quiz
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderSettings = () => {
    return (
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.primary }]}>
          <TouchableOpacity onPress={() => setCurrentScreen('home')}>
            <Text style={{ fontSize: fonts.large, color: '#FFFFFF' }}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: fonts.xxlarge, color: '#FFFFFF' }]}>
            Settings
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Dark Mode */}
        <View style={[styles.settingItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View>
            <Text style={[styles.settingLabel, { fontSize: fonts.medium, color: theme.text }]}>
              Dark Mode
            </Text>
            <Text style={[styles.settingDescription, { fontSize: fonts.small, color: theme.textSecondary }]}>
              {isDarkMode ? 'Dark' : 'Light'} theme active
            </Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: theme.disabled, true: theme.primary }}
            thumbColor={isDarkMode ? '#FFFFFF' : '#F4F3F4'}
          />
        </View>

        {/* Font Size */}
        <View style={[styles.settingItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingLabel, { fontSize: fonts.medium, color: theme.text }]}>
              Font Size
            </Text>
            <Text style={[styles.settingDescription, { fontSize: fonts.small, color: theme.textSecondary }]}>
              Current: {fontSize.charAt(0).toUpperCase() + fontSize.slice(1)}
            </Text>
          </View>
        </View>
        <View style={[styles.fontSizeButtons, { backgroundColor: theme.card }]}>
          {(['small', 'medium', 'large'] as FontSize[]).map(size => (
            <TouchableOpacity
              key={size}
              style={[
                styles.fontSizeButton,
                fontSize === size && { backgroundColor: theme.primary },
                { borderColor: theme.border }
              ]}
              onPress={() => changeFontSize(size)}
            >
              <Text style={[
                styles.fontSizeButtonText,
                fontSize === size ? { color: '#FFFFFF' } : { color: theme.text }
              ]}>
                {size.charAt(0).toUpperCase() + size.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Export Data */}
        <TouchableOpacity
          style={[styles.settingButton, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={exportData}
        >
          <Text style={[styles.settingButtonText, { fontSize: fonts.medium, color: theme.primary }]}>
            📤 Export Backup
          </Text>
        </TouchableOpacity>

        {/* App Info */}
        <View style={[styles.appInfo, { backgroundColor: theme.card }]}>
          <Text style={[styles.appInfoText, { fontSize: fonts.small, color: theme.textSecondary }]}>
            UWtopia Rx V5 - Production
          </Text>
          <Text style={[styles.appInfoText, { fontSize: fonts.small, color: theme.textSecondary }]}>
            Version 5.0.0
          </Text>
          <Text style={[styles.appInfoText, { fontSize: fonts.small, color: theme.textSecondary }]}>
            {allQuestions.length} Questions
          </Text>
        </View>
      </ScrollView>
    );
  };

  const renderCustomQuizBuilder = () => {
    const filtered = getFilteredQuestions();

    return (
      <Modal
        visible={showCustomQuizBuilder}
        animationType="slide"
        onRequestClose={() => setShowCustomQuizBuilder(false)}
      >
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={[styles.header, { backgroundColor: theme.primary }]}>
            <TouchableOpacity onPress={() => setShowCustomQuizBuilder(false)}>
              <Text style={{ fontSize: fonts.large, color: '#FFFFFF' }}>✕</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { fontSize: fonts.xxlarge, color: '#FFFFFF' }]}>
              Create Custom Quiz
            </Text>
            <TouchableOpacity onPress={saveCustomQuiz}>
              <Text style={{ fontSize: fonts.medium, color: '#FFFFFF', fontWeight: 'bold' }}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.quizNameInput, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TextInput
              style={[styles.quizNameField, { fontSize: fonts.regular, color: theme.text }]}
              placeholder="Quiz Name"
              placeholderTextColor={theme.textSecondary}
              value={newQuizName}
              onChangeText={setNewQuizName}
            />
          </View>

          <View style={[styles.selectionInfo, { backgroundColor: theme.card }]}>
            <Text style={[styles.selectionText, { fontSize: fonts.medium, color: theme.text }]}>
              {selectedQuestions.size} questions selected
            </Text>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => {
              const isSelected = selectedQuestions.has(item.id);
              return (
                <TouchableOpacity
                  style={[
                    styles.questionSelectItem,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    isSelected && { borderColor: theme.primary, borderWidth: 2 }
                  ]}
                  onPress={() => {
                    const updated = new Set(selectedQuestions);
                    if (isSelected) {
                      updated.delete(item.id);
                    } else {
                      updated.add(item.id);
                    }
                    setSelectedQuestions(updated);
                  }}
                >
                  <View style={[
                    styles.checkbox,
                    { borderColor: theme.border },
                    isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
                  ]}>
                    {isSelected && <Text style={{ color: '#FFFFFF', fontSize: fonts.tiny }}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.questionSelectText, { fontSize: fonts.small, color: theme.text }]} numberOfLines={2}>
                      {item.question.replace(/<[^>]*>/g, '')}
                    </Text>
                    <Text style={[styles.questionSelectCategory, { fontSize: fonts.tiny, color: theme.textSecondary }]}>
                      {item.category}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    );
  };

  // -------------------------------------------------------------------------
  // MAIN RENDER
  // -------------------------------------------------------------------------

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {currentScreen === 'home' && renderHome()}
      {currentScreen === 'quiz' && renderQuiz()}
      {currentScreen === 'results' && renderResults()}
      {currentScreen === 'settings' && renderSettings()}
      {showCustomQuizBuilder && renderCustomQuizBuilder()}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
  },
  statsCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
  statsTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {},
  section: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  modeButtonText: {
    fontWeight: '600',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryButtonText: {
    fontWeight: '600',
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerPresets: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  timerButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  timerButtonText: {
    fontWeight: '600',
  },
  startButton: {
    margin: 16,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  secondaryButton: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontWeight: 'bold',
  },
  customQuizItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  customQuizName: {
    fontWeight: '600',
  },
  customQuizInfo: {},
  quizStartButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  quizStartButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  quizDeleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  quizProgress: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  timerText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginTop: 4,
  },
  progressBarContainer: {
    height: 4,
  },
  progressBar: {
    height: '100%',
  },
  quizContent: {
    flex: 1,
    padding: 16,
  },
  questionCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCircleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  explanationCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
  },
  explanationTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  quizFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
  },
  navButton: {
    padding: 12,
  },
  navButtonText: {
    fontWeight: '600',
  },
  submitButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  scoreCard: {
    margin: 16,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  scorePercentage: {
    fontWeight: 'bold',
  },
  scoreLabel: {
    marginTop: 8,
  },
  resultsStats: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  resultStatItem: {
    alignItems: 'center',
  },
  resultStatNumber: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultStatLabel: {},
  primaryButton: {
    margin: 16,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  settingLabel: {
    fontWeight: '600',
  },
  settingDescription: {
    marginTop: 4,
  },
  fontSizeButtons: {
    flexDirection: 'row',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  fontSizeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  fontSizeButtonText: {
    fontWeight: '600',
  },
  settingButton: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  settingButtonText: {
    fontWeight: 'bold',
  },
  appInfo: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  appInfoText: {
    marginVertical: 2,
  },
  quizNameInput: {
    margin: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  quizNameField: {
    padding: 8,
  },
  selectionInfo: {
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectionText: {
    fontWeight: '600',
  },
  questionSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionSelectText: {
    marginBottom: 4,
  },
  questionSelectCategory: {},
});
