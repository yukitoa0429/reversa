/**
 * Reversa - アプリの状態管理 (State Management)
 */

var currentState = {
    // 進行状態
    currentLevel: 'beginner',
    currentQuestion: 0,
    score: 0,
    
    // 設定
    isSilent: false,
    isBlind: true,
    useNaturalVoice: true,
    
    // 問題データ
    allSequences: [],
    recentQuestions: [],
    
    // ログ
    turnLogs: [],
    
    // 現在の問題情報
    originalWord: '',
    originalSequence: [],
    correctAnswer: '',
    
    // オーディオ・タイマー
    currentAudioBlob: null,
    autoAdvanceTimer: null,
    isRecording: false
};
