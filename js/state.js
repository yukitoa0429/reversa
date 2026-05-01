// Reversa - Global State Management

let GLOBAL_PLAYER = {
    audioCtx: null,
    activeSources: [] 
};

let db;

let currentState = {
    screen: 'home',
    level: 3,
    currentQuestion: 0,
    score: 0,
    correctAnswer: '',
    originalWord: '',
    originalSequence: [],
    isReading: false,
    mediaRecorder: null,
    audioChunks: [],
    recordingTimer: null,
    countdownInterval: null,
    isRecording: false,
    currentAudioBlob: null,
    activeAudio: null,
    questionSet: [],
    turnLogs: [], 
    recentQuestions: [], 
    isSilent: false,
    isBlind: true,
    useNaturalVoice: true
};
