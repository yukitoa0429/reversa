/**
 * Reversa - Core Application Logic (POC Version)
 * All-in-one script for stability and easy porting to Flutter.
 * Documentation and console logs are in English for cross-platform compatibility (Win/Mac).
 */

// --- 1. Global Constants ---
const QUESTIONS_PER_TURN = 10;
const SPEECH_RATE = 1.0;
const RHYTHM_BEAT_MS = 600;
const MAX_RECORDING_TIME = 10000;
const DB_NAME = 'reversa_audio_v13';
const DB_VERSION = 1;
const STORE_NAME = 'audio_cache';

// --- 2. Global State ---
let db = null;
const currentState = {
    screen: 'home',
    level: 'beginner',
    currentQuestion: 0,
    score: 0,
    correctAnswer: '',
    originalWord: '',
    originalSequence: [],
    isReading: false,
    isRecording: false,
    mediaRecorder: null,
    audioChunks: [],
    turnLogs: [],
    recentQuestions: [],
    isSilent: false,
    isBlind: true,
    useNaturalVoice: true
};

const GLOBAL_PLAYER = {
    audioCtx: null,
    activeSources: []
};

// --- 3. UI Elements Mapping ---
let elements = {};
function initUIElements() {
    elements = {
        screenHome: document.getElementById('screen-home'),
        screenLoading: document.getElementById('screen-loading'),
        screenGame: document.getElementById('screen-game'),
        screenResult: document.getElementById('screen-result'),
        
        checkSilent: document.getElementById('check-silent'),
        checkBlind: document.getElementById('check-blind'),
        checkNatural: document.getElementById('check-natural'),

        labelLevel: document.getElementById('label-level'),
        labelProgress: document.getElementById('label-progress'),
        labelScore: document.getElementById('label-score'),
        gameStatus: document.getElementById('game-status'),
        voiceIndicator: document.getElementById('voice-indicator'),
        recordingContainer: document.getElementById('recording-container'),
        recordingStatus: document.getElementById('recording-status'),
        recordingCountdown: document.getElementById('recording-countdown'),
        gameWaveformCanvas: document.getElementById('game-waveform-canvas'),

        feedbackPanel: document.getElementById('feedback-panel'),
        feedbackBadge: document.getElementById('feedback-badge'),
        displayCorrectReverse: document.getElementById('display-correct-reverse'),
        displayUserAnswer: document.getElementById('display-user-answer'),
        userAnswerContainer: document.getElementById('user-answer-container'),
        btnNext: document.getElementById('btn-next'),

        loadingBar: document.getElementById('loading-bar'),
        loadingStatus: document.getElementById('loading-status'),
        loadingTitle: document.getElementById('loading-title'),
        btnStartAfterLoad: document.getElementById('btn-start-after-load'),
        loadingSpinner: document.querySelector('.loading-spinner'),

        accuracyPath: document.getElementById('accuracy-path'),
        accuracyText: document.getElementById('accuracy-text'),
        resultMessage: document.getElementById('result-message'),
        resultHistoryList: document.getElementById('result-history-list'),

        flashContainer: document.getElementById('flash-container'),
        flashCharacter: document.getElementById('flash-character')
    };
    console.log("UI Elements mapped.");
}

// --- 4. Utilities ---
function normalizeText(text) {
    if (!text) return "";
    let res = text.trim().toLowerCase();
    res = res.replace(/^(答えは|回答は|単語は|いうのは|それは|正解は)[、。\s：:：]*/g, "");
    res = res.replace(/(ですよ|でした|になります|[。！？!\?])*$/g, ""); 
    res = res.replace(/[「」『』【】（）()\[\]"']/g, ""); 
    const kanjiMap = { '〇': '0', '一': '1', '二': '2', '三': '3', '四': '4', '五': '5', '六': '6', '七': '7', '八': '8', '九': '9' };
    res = res.replace(/[〇一二三四五六七八九]/g, m => kanjiMap[m]);
    res = res.replace(/[０-９]/g, m => String.fromCharCode(m.charCodeAt(0) - 0xFEE0));
    res = res.replace(/[、。！？!？\s\-・,._]/g, "");
    res = res.replace(/[^\u3041-\u30960-9]/g, ""); 
    return res;
}

function katakanaToHiragana(src) {
    if (!src) return "";
    return src.replace(/[\u30a1-\u30f6]/g, function(match) {
        var chr = match.charCodeAt(0) - 0x60;
        return String.fromCharCode(chr);
    });
}

function getMoraCount(text) {
    if (!text) return 0;
    return text.replace(/[ゃゅょぁぃぅぇぉ]/g, '').length;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// --- 5. Audio Engine ---
function getAudioContext() {
    if (!GLOBAL_PLAYER.audioCtx) {
        GLOBAL_PLAYER.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (GLOBAL_PLAYER.audioCtx.state === 'suspended') {
        GLOBAL_PLAYER.audioCtx.resume();
    }
    return GLOBAL_PLAYER.audioCtx;
}

async function initDB() {
    if (db) return db;
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = e => {
            const d = e.target.result;
            if (!d.objectStoreNames.contains(STORE_NAME)) d.createObjectStore(STORE_NAME);
        };
        request.onsuccess = e => { db = e.target.result; resolve(db); };
        request.onerror = e => reject(e.target.error);
    });
}

async function getAudioBlob(word, type = 'orig') {
    if (!db) await initDB();
    const cacheKey = `${type}_${word}`;
    
    const cached = await new Promise(r => {
        const tx = db.transaction([STORE_NAME], 'readonly');
        const req = tx.objectStore(STORE_NAME).get(cacheKey);
        req.onsuccess = () => r(req.result);
        req.onerror = () => r(null);
    });
    if (cached) return cached;

    console.log(`Fetching TTS for: ${word}`);
    try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${window.CONFIG.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: word,
                voice: "onyx",
                speed: SPEECH_RATE
            })
        });
        if (!response.ok) throw new Error("TTS API Error");
        const blob = await response.blob();
        const tx = db.transaction([STORE_NAME], 'readwrite');
        tx.objectStore(STORE_NAME).put(blob, cacheKey);
        return blob;
    } catch (e) {
        console.error("Audio fetch failed:", e);
        return null;
    }
}

async function playBlob(blob) {
    const ctx = getAudioContext();
    try {
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();
        GLOBAL_PLAYER.activeSources.push(source);
        source.onended = () => {
            GLOBAL_PLAYER.activeSources = GLOBAL_PLAYER.activeSources.filter(s => s !== source);
        };
    } catch (err) { console.error("Playback error:", err); }
}

function playSE(type) {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    if (type === 'correct') {
        osc.frequency.setValueAtTime(880, now); 
        osc.frequency.setValueAtTime(1108, now + 0.1); 
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(); osc.stop(now + 0.3);
    } else if (type === 'wrong') {
        osc.frequency.setValueAtTime(150, now);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(); osc.stop(now + 0.3);
    }
}

// --- 6. Core Game Logic ---
function showScreen(screenId) {
    Object.values(elements).forEach(el => {
        if (el && el.classList && el.classList.contains('screen')) el.classList.remove('active');
    });
    const target = document.getElementById(`screen-${screenId}`);
    if (target) target.classList.add('active');
}

function getNextQuestion(theme) {
    const pool = window.QUESTION_DATABASE[theme] || [];
    if (pool.length === 0) return null;
    let availablePool = pool.filter(q => !currentState.recentQuestions.includes(q.word));
    if (availablePool.length === 0) {
        availablePool = pool;
        currentState.recentQuestions = [];
    }
    const randomIndex = Math.floor(Math.random() * availablePool.length);
    const selected = availablePool[randomIndex];
    currentState.recentQuestions.push(selected.word);
    if (currentState.recentQuestions.length > 5) currentState.recentQuestions.shift();
    return selected;
}

async function startGame(theme) {
    console.log(`Starting game level: ${theme}`);
    currentState.level = theme;
    currentState.currentQuestion = 0;
    currentState.score = 0;
    currentState.turnLogs = [];
    
    currentState.isSilent = (elements.checkSilent && elements.checkSilent.checked);
    currentState.isBlind = (elements.checkBlind && elements.checkBlind.checked);
    currentState.useNaturalVoice = (elements.checkNatural && elements.checkNatural.checked);

    currentState.allSequences = [];
    for (let i = 0; i < QUESTIONS_PER_TURN; i++) {
        const q = getNextQuestion(theme);
        if (q) currentState.allSequences.push(q);
    }

    showScreen('loading');
    await preloadAudios(currentState.allSequences);
}

async function preloadAudios(questions) {
    const total = questions.length;
    if (elements.loadingSpinner) elements.loadingSpinner.classList.remove('hidden');
    if (elements.btnStartAfterLoad) elements.btnStartAfterLoad.classList.add('hidden');
    
    for (let i = 0; i < total; i++) {
        const q = questions[i];
        if (elements.loadingStatus) elements.loadingStatus.textContent = `${i + 1} / ${total} 準備中...`;
        await getAudioBlob(q.word, 'orig');
        await getAudioBlob(q.reverse, 'rev');
        const progress = ((i + 1) / total) * 100;
        if (elements.loadingBar) elements.loadingBar.style.width = `${progress}%`;
    }
    if (elements.loadingStatus) elements.loadingStatus.textContent = '準備完了';
    if (elements.loadingTitle) elements.loadingTitle.textContent = '準備が整いました！';
    if (elements.loadingSpinner) elements.loadingSpinner.classList.add('hidden');
    if (elements.btnStartAfterLoad) elements.btnStartAfterLoad.classList.remove('hidden');
}

function startQuestion() {
    currentState.currentQuestion++;
    if (elements.labelProgress) elements.labelProgress.textContent = `${currentState.currentQuestion} / ${QUESTIONS_PER_TURN}`;
    
    const q = currentState.allSequences[currentState.currentQuestion - 1];
    if (!q) { showResult(); return; }
    
    currentState.originalWord = q.word;
    currentState.correctAnswer = q.reverse;
    
    showScreen('game');
    playQuestion(q);
}

async function playQuestion(q) {
    if (elements.gameStatus) elements.gameStatus.textContent = '準備中...';
    if (elements.voiceIndicator) elements.voiceIndicator.classList.remove('hidden');

    if (!currentState.isBlind && elements.flashContainer) {
        elements.flashContainer.classList.remove('hidden');
        elements.flashCharacter.textContent = '?';
    }

    const blob = await getAudioBlob(q.word, 'orig');
    if (blob) await playBlob(blob);
    await sleep(1500);

    if (elements.flashContainer) elements.flashContainer.classList.add('hidden');
    if (elements.voiceIndicator) elements.voiceIndicator.classList.add('hidden');
    
    if (elements.recordingContainer) elements.recordingContainer.classList.remove('hidden');
    startRecording();
}

// --- 7. Voice Recording & Recognition ---
async function startRecording() {
    if (currentState.isRecording) return;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        currentState.mediaRecorder = new MediaRecorder(stream);
        currentState.audioChunks = [];
        
        currentState.mediaRecorder.ondataavailable = e => currentState.audioChunks.push(e.data);
        currentState.mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(currentState.audioChunks, { type: 'audio/webm' });
            processAudio(audioBlob);
            stream.getTracks().forEach(track => track.stop());
        };

        currentState.mediaRecorder.start();
        currentState.isRecording = true;
        if (elements.gameStatus) elements.gameStatus.textContent = '話してください...';
        
        // Simple timer for recording limit
        setTimeout(() => { if (currentState.isRecording) stopRecording(); }, 4000);
    } catch (err) {
        console.error('Mic access denied:', err);
    }
}

function stopRecording() {
    if (currentState.mediaRecorder && currentState.isRecording) {
        currentState.mediaRecorder.stop();
        currentState.isRecording = false;
        if (elements.recordingContainer) elements.recordingContainer.classList.add('hidden');
    }
}

async function processAudio(blob) {
    if (elements.gameStatus) elements.gameStatus.textContent = '解析中...';
    try {
        const formData = new FormData();
        formData.append('file', blob, 'answer.webm');
        formData.append('model', 'whisper-1');
        formData.append('language', 'ja');
        
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${window.CONFIG.OPENAI_API_KEY}` },
            body: formData
        });

        if (!response.ok) throw new Error("Whisper API Error");
        const data = await response.json();
        submitAnswer(data.text);
    } catch (err) {
        console.error('Recognition error:', err);
        submitAnswer("");
    }
}

function submitAnswer(rawAnswer) {
    if (elements.feedbackPanel) elements.feedbackPanel.classList.remove('hidden');
    const cleaned = normalizeText(rawAnswer);
    const correct = normalizeText(currentState.correctAnswer);
    const isCorrect = (cleaned === correct);

    if (isCorrect) {
        playSE('correct');
        currentState.score++;
        if (elements.feedbackBadge) {
            elements.feedbackBadge.textContent = 'お見事';
            elements.feedbackBadge.className = 'feedback-badge hanko-stamp animate';
        }
    } else {
        playSE('wrong');
        if (elements.feedbackBadge) {
            elements.feedbackBadge.textContent = '✕';
            elements.feedbackBadge.className = 'feedback-badge wrong-stamp animate';
        }
    }
    
    if (elements.displayCorrectReverse) elements.displayCorrectReverse.textContent = katakanaToHiragana(currentState.correctAnswer);
    if (elements.displayUserAnswer) elements.displayUserAnswer.textContent = cleaned || '(無音)';
    if (elements.labelScore) elements.labelScore.textContent = `Score: ${currentState.score}`;
    if (elements.btnNext) elements.btnNext.textContent = currentState.currentQuestion >= QUESTIONS_PER_TURN ? '結果を見る' : '次へ';
}

function nextQuestion() {
    if (elements.feedbackPanel) elements.feedbackPanel.classList.add('hidden');
    if (currentState.currentQuestion >= QUESTIONS_PER_TURN) showResult(); else startQuestion();
}

function showResult() {
    const accuracy = Math.round((currentState.score / QUESTIONS_PER_TURN) * 100);
    showScreen('result');
    if (elements.accuracyText) elements.accuracyText.textContent = `${accuracy}%`;
    if (elements.accuracyPath) elements.accuracyPath.style.strokeDasharray = `${accuracy}, 100`;
    if (elements.resultMessage) elements.resultMessage.textContent = accuracy === 100 ? '全問正解！🎉' : 'お疲れ様でした！';
}

// --- 8. Initialize ---
window.onload = () => {
    initUIElements();
    console.log("Reversa app started.");
};
