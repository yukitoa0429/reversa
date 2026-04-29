// Reversa - OpenAI Whisper & TTS Logic with Persistent Caching (IndexedDB)

// --- Constants & Data ---
const WORD_LIBRARY = {
    3: ['きつね', 'すいか', 'めがね', 'いちご', 'さくら', 'りんご', 'うさぎ', 'くるま', 'みかん', 'すずめ', 'テレビ', 'バナナ', 'ピアノ', 'メロン', 'カラス'],
    4: ['カフェイン', 'ライオン', 'ひこうき', 'どうぶつ', 'ひまわり', 'おまつり', 'とけいだ', 'にちよう', 'ふじさん', 'たいよう', 'カメラま', 'ネクタイ', 'にんじん', 'サンタく'],
    5: ['キーボード', 'チョコレート', 'しんかんせん', 'スマートフォン', 'あいうえお', 'おにぎりや', 'せんたくき', 'れいぞうこ', 'えんぴつて', 'かいものい', 'おべんとう', 'さきゅうだ', 'きょうりゅう', 'ゆうえんち', 'すべりだい'],
    6: ['こうむいんし', 'しゃかいいん', 'としょかんい', 'じてんしゃで', 'がくせいたち', 'きょう教科書', 'じむしょです', 'たべものや', 'のみものだ', 'はくぶつかん', 'でんわばんご', 'ゆうびんきょ', 'てんきよほう', 'なつやすみだ', 'ふゆやすみだ'],
    7: ['じどうはんばい', 'けんこうしんだ', 'じこしょうかい', 'さいしゅうれっ', 'でんしじしょ', 'おうだんほどう', 'しんごうきです', 'じょうほうしょ', 'おもいでづくり', 'だいかぞくです', 'せんもんがっこ', 'こうきゅうしゃ', 'たんじょうびお', 'クリスマスだ', 'おしょうがつだ'],
    8: ['じゅんびうんどう', 'きんきゅうじしん', 'いぶんかこうりゅう', 'かんぜんよやく', 'とくべつしえん', 'こうつうあんぜん', 'せんもんてきな', 'おもしろいひと', 'きれいなけしき', 'おいしいたべも', 'べんきょうちゅう', 'しごとちゅうだ', 'にほんごがっこう', 'りょこうにいく', 'はるやすみです']
};

const NUMBERS_PATTERNS = [
    '123', '456', '789', '012', '987', '654', '321', '007', '888', '111',
    '2024', '1999', '1234', '5678', '9012', '4321', '8765', '2468', '1357', '0000',
    '10203', '98765', '54321', '11223', '99887', '12345', '67890', '55555', '10101',
    '123456', '654321', '111222', '987654', '101010', '777888', '121212', '909090',
    '1234567', '7654321', '1010101', '9999999', '12345678', '87654321', '10000000'
];

function katakanaToHiragana(src) {
    return src.replace(/[\u30a1-\u30f6]/g, function(match) {
        var chr = match.charCodeAt(0) - 0x60;
        return String.fromCharCode(chr);
    });
}

function hiraganaToKatakana(src) {
    return src.replace(/[\u3041-\u3096]/g, function(match) {
        var chr = match.charCodeAt(0) + 0x60;
        return String.fromCharCode(chr);
    });
}

function numberToPhonetic(src) {
    const map = { '0': 'まる', '1': 'いち', '2': 'に', '3': 'さん', '4': 'よん', '5': 'ご', '6': 'ろく', '7': 'なな', '8': 'はち', '9': 'きゅう' };
    return src.toString().split('').map(c => map[c] || c).join('、');
}

const QUESTIONS_PER_TURN = 10;
const SPEECH_RATE = 0.95; 
const READ_REPEAT = 2;
const MAX_RECORDING_TIME = 20000; // 20s Recording limit
const WAIT_FOR_START_TIME = 15000; // 15s Waiting limit for manual start
const RHYTHM_BEAT_MS = 750; // Slower tempo: 750ms per beat

// --- Global Audio State ---
let GLOBAL_PLAYER = {
    audioCtx: null,
    activeSources: [] // Track playing nodes to stop them if needed
};

const PILOT_WORDS = [
    "なつやすみ", "しあわせな", "おくりもの", "あさごはん", "あきまつり",
    "ぼうけんに", "こんにちは", "さようなら", "ありがとう", "だいじょうぶ",
    "おともだち", "としょかん", "ぶんかさい", "おもいやり", "たからもの",
    "ほしぞらに", "ひまわりの", "おもいでに", "ゆうやけに", "ほうかごに"
];

const PILOT_NUMBERS = [
    "１２３４５", "９８７６５", "２４６８０", "１３５７９", "５５５５５",
    "１１２２３", "９９８８７", "４５６７８", "８７６５４", "１０２０３",
    "５０６０７", "３１４１５", "２７１８２", "８００８０", "１９２８３",
    "７４６３５", "３９３９３", "０１２３４", "５６７８９", "９０９０９"
];

function getPlaybackContext() {
    if (!GLOBAL_PLAYER.audioCtx) {
        GLOBAL_PLAYER.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (GLOBAL_PLAYER.audioCtx.state === 'suspended') {
        GLOBAL_PLAYER.audioCtx.resume();
    }
    return GLOBAL_PLAYER.audioCtx;
}

// --- Sound Effects (SE) ---
function playSE(type) {
    try {
        const ctx = getPlaybackContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        if (type === 'start') {
            // ポンッ (出題前)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'correct') {
            // ピンポン♪ (正解)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now); // A5
            osc.frequency.setValueAtTime(1108.73, now + 0.15); // C#6
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            
            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === 'wrong') {
            // ブブー (不正解)
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
            
            osc.start(now);
            osc.stop(now + 0.3);
        }
    } catch (e) {
        console.warn("SE Playback failed:", e);
    }
}

// --- Database Configuration (IndexedDB) ---
const DB_NAME = 'ReversaAudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'audioCache';
let db;

// --- State ---
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
    activeAudio: null, // Keep track of currently playing audio
    questionSet: [],
    turnLogs: [], // 1ターン内の一時的な履歴保存
    recentQuestions: [], // 直近の出題履歴（重複回避用）
    isSilent: false,
    isBlind: true
};

let vapiInstance = null;

// --- DOM Elements ---
const screens = {
    home: document.getElementById('screen-home'),
    loading: document.getElementById('screen-loading'),
    game: document.getElementById('screen-game'),
    result: document.getElementById('screen-result')
};

const elements = {
    levelOptions: document.getElementById('level-options'),
    labelLevel: document.getElementById('label-level'),
    labelProgress: document.getElementById('label-progress'),
    labelScore: document.getElementById('label-score'),
    gameStatus: document.getElementById('game-status'),
    voiceIndicator: document.getElementById('voice-indicator'),
    recordingContainer: document.getElementById('recording-container'),
    recordingStatus: document.getElementById('recording-status'),
    feedbackPanel: document.getElementById('feedback-panel'),
    feedbackBadge: document.getElementById('feedback-badge'),
    displayOriginal: document.getElementById('display-original'),
    displayCorrectReverse: document.getElementById('display-correct-reverse'),
    displayUserAnswer: document.getElementById('display-user-answer'),
    userAnswerContainer: document.getElementById('user-answer-container'),
    feedbackText: document.getElementById('feedback-text'),
    btnNext: document.getElementById('btn-next'),
    btnRestart: document.getElementById('btn-restart'),
    btnExportLog: document.getElementById('btn-export-log'),
    accuracyPath: document.getElementById('accuracy-path'),
    accuracyText: document.getElementById('accuracy-text'),
    resultMessage: document.getElementById('result-message'),
    loadingBar: document.getElementById('loading-bar'),
    loadingStatus: document.getElementById('loading-status'),
    loadingTitle: document.getElementById('loading-title'),
    btnStartAfterLoad: document.getElementById('btn-start-after-load'),
    loadingSpinner: document.querySelector('.loading-spinner'),
    btnRetryRecord: document.getElementById('btn-retry-record'),
    btnSkipQuestion: document.getElementById('btn-skip-question'),
    actionChoiceGroup: document.getElementById('action-choice-group'),
    micArea: document.getElementById('mic-area'),
    countdownArea: document.getElementById('countdown-area'),
    countdownArea: document.getElementById('countdown-area'),
    recordingCountdown: document.getElementById('recording-countdown'),
    btnPlayMaster: document.getElementById('btn-play-master'),
    btnStartRecord: document.getElementById('btn-start-record'),
    checkSilent: document.getElementById('check-silent'),
    gameWaveformCanvas: document.getElementById('game-waveform-canvas'),
    checkBlind: document.getElementById('check-blind'),
    // Flash
    flashContainer: document.getElementById('flash-container'),
    flashCharacter: document.getElementById('flash-character'),
    // Dev Mode
    openDevBtn: document.getElementById('btn-open-dev'),
    devBackBtn: document.getElementById('btn-dev-back'),
    devListContainer: document.getElementById('dev-list-container'),
    devTargetText: document.getElementById('dev-target-text'),
    btnRecordDev: document.getElementById('btn-record-dev'),
    btnRecordRhythm: document.getElementById('btn-record-rhythm'),
    btnPlayDev: document.getElementById('btn-play-dev'),
    btnSaveDev: document.getElementById('btn-save-dev'),
    devStatus: document.getElementById('dev-status'),
    pilotProgress: document.getElementById('pilot-progress'),
    pilotStatus: document.getElementById('pilot-status'),
    pilotBar: document.getElementById('pilot-bar'),
    waveformCanvas: document.getElementById('waveform-canvas'),
    waveformCanvasStatic: document.getElementById('waveform-canvas-static'),
    metronomeArea: document.getElementById('metronome-area'),
    rhythmCountdown: document.getElementById('rhythm-countdown'),
    beatIndicator: document.getElementById('recording-beat-indicator'),
    waveformPreview: document.getElementById('waveform-preview'),
    screens: {
        home: document.getElementById('screen-home'),
        game: document.getElementById('screen-game'),
        result: document.getElementById('screen-result'),
        loading: document.getElementById('screen-loading'),
        dev: document.getElementById('screen-dev')
    }
};

const DEV_SERVER_URL = "http://127.0.0.1:8081";

// --- Initialization ---
async function init() {
    console.log("Reversa Initializing... (Mode: OpenAI TTS with Persistent Cache)");
    
    // Initialize Database
    try {
        await initDB();
    } catch (e) {
        console.warn("IndexedDB initialization failed. Falling back to memory cache.", e);
    }

    // レベルボタン生成はHTML側に移行したため削除

    elements.btnNext.onclick = nextQuestion;
    elements.btnRestart.onclick = () => showScreen('home');
    elements.btnExportLog.onclick = exportLogs;
    elements.btnSkipQuestion.onclick = skipQuestion;
    if (elements.btnPlayMaster) {
        elements.btnPlayMaster.onclick = playMasterAudio;
    }
    elements.btnRetryRecord.onclick = () => {
        elements.recordingContainer.classList.add('hidden');
        elements.voiceIndicator.classList.remove('hidden');
        elements.gameStatus.textContent = '読み上げ直しています...';
        currentState.isReading = false; // Force reset for retry
        readSequence(currentState.originalSequence);
    };
    elements.btnStartAfterLoad.onclick = () => {
        showScreen('game');
        startQuestion();
    };

    // Global Listeners
    if (elements.checkSilent) {
        elements.checkSilent.onchange = (e) => {
            currentState.isSilent = e.target.checked;
        };
    }
    if (elements.checkBlind) {
        elements.checkBlind.onchange = (e) => {
            currentState.isBlind = e.target.checked;
        };
    }

    elements.openDevBtn.onclick = () => showScreen('dev');
    elements.devBackBtn.onclick = () => showScreen('home');
    
    // Dev Tabs
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => switchDevTab(btn.dataset.tab);
    });

    elements.btnRecordDev.onclick = toggleDevRecording;
    elements.btnRecordRhythm.onclick = startRhythmRecording;
    elements.btnPlayDev.onclick = playCurrentDevRecording;
    elements.btnSaveDev.onclick = saveCurrentDevRecording;
    
    // Restore Test Buttons
    const testCases = {
        'btn-test-mora': 'あいうえお',
        'btn-test-ka': 'かきくけこ',
        'btn-test-sa': 'さしすせそ',
        'btn-test-ta': 'たちつてと',
        'btn-test-na': 'なにぬねの',
        'btn-test-ha': 'はひふへほ',
        'btn-test-ma': 'まみむめも',
        'btn-test-ya': 'やゆよ',
        'btn-test-wa': 'わをん',
        'btn-test-hashi': 'はし'
    };
    Object.entries(testCases).forEach(([id, text]) => {
        const btn = document.getElementById(id);
        if (btn) btn.onclick = () => testMoraConcatenation(text);
    });

    // Initialize UI Phase
    showScreen('home');
    initDevMode();

    // Check if API key is set
    if (typeof CONFIG === 'undefined' || CONFIG.OPENAI_API_KEY === "PASTE_YOUR_KEY_HERE" || !CONFIG.OPENAI_API_KEY) {
        setTimeout(() => {
            alert('OpenAI APIキーが設定されていません。config.js を編集してキーを入力してください。');
        }, 500);
    }
}

// --- Database Logic ---
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = (event) => {
            db = event.target.result;
            resolve();
        };
        request.onerror = (event) => reject(event.target.error);
    });
}

async function getCachedAudio(key) {
    if (!db) return null;
    return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
    });
}

async function saveCachedAudio(key, blob) {
    if (!db) return;
    return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(blob, key);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
    });
}

// --- Screen Management ---
function showScreen(screenId) {
    Object.keys(elements.screens).forEach(key => {
        elements.screens[key].classList.toggle('active', key === screenId);
    });
    currentState.screen = screenId;
    
    // ホーム画面に戻る時は背景を消し、VAPIを切断する
    if (screenId === 'home') {
        const dynamicBg = document.getElementById('dynamic-bg');
        if (dynamicBg) dynamicBg.classList.remove('active');
        
        if (vapiInstance) {
            vapiInstance.stop();
            vapiInstance = null;
        }
    }
}

// --- Game Logic ---
/**
 * Pick a question from the fixed database (from questions.js)
 */
function getNextQuestion(theme) {
    const pool = QUESTION_DATABASE[theme] || [];
    if (pool.length > 0) {
        // 重複回避: recentQuestions に含まれない問題をフィルタリング
        let availablePool = pool.filter(q => !currentState.recentQuestions.includes(q.word));
        
        // もし全て出尽くしてしまっていたらリセット
        if (availablePool.length === 0) {
            availablePool = pool;
            currentState.recentQuestions = [];
        }

        const randomIndex = Math.floor(Math.random() * availablePool.length);
        const selectedQuestion = availablePool[randomIndex];

        // 履歴を更新（最大5件）
        currentState.recentQuestions.push(selectedQuestion.word);
        if (currentState.recentQuestions.length > 5) {
            currentState.recentQuestions.shift();
        }

        return selectedQuestion;
    }
    return null;
}

async function startGame(theme) {
    currentState.currentLevel = theme;
    currentState.currentQuestion = 0;
    currentState.score = 0;
    currentState.logs = [];
    currentState.turnLogs = [];

    // VAPIの初期化と開始
    if (!vapiInstance && window.Vapi) {
        try {
            vapiInstance = new window.Vapi(CONFIG.VAPI_PUBLIC_KEY);
            vapiInstance.start({
                model: {
                    provider: "openai",
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content: "あなたは脳トレアプリReversaのトレーナーです。アプリが効果音で判定を行うので、あなたはシステムメッセージを受け取った時だけ「ナイス！」「おしい！」など一言だけで相槌を打ってください。ユーザーの声に直接返答したり、長い説明をしたりするのは絶対に禁止です。"
                        }
                    ]
                },
                voice: {
                    provider: "openai",
                    voiceId: "shimmer" // 優しい女性の声
                }
            });
        } catch (e) {
            console.error("VAPI initialization failed", e);
        }
    }

    // Decide questions for this turn
    currentState.allSequences = [];
    const pool = QUESTION_DATABASE[theme] || [];
    if (pool.length < 1) {
        alert(`テーマ ${theme} の問題データが登録されていません。`);
        showScreen('home');
        return;
    }

    for (let i = 0; i < QUESTIONS_PER_TURN; i++) {
        const q = getNextQuestion(theme);
        if (q) currentState.allSequences.push(q);
    }

    showScreen('loading');
    await preloadAudios(currentState.allSequences);
}

/**
 * Enhanced Audio Fetching: IndexedDB (Cache) -> Cloud (OpenAI TTS) -> Local Assets
 * ユーザーの録音データよりも高品質なAIボイスを優先的に使用するように設定しました。
 */
async function getAudioBlob(word, type = 'orig') {
    // 以前の低品質キャッシュを使わないよう、キーを「v6_」に更新
    const prefix = (type === 'rev') ? 'v7_rev_' : `v7_${type}_`;
    const cacheKey = `${prefix}${word}`;
    
    // 1. IndexedDBキャッシュをまず探す (二回目以降の高速化とコスト節約)
    const cachedBlob = await getCachedAudio(cacheKey);
    if (cachedBlob) return cachedBlob;

    // 2. クラウド優先 (OpenAI TTS) - 高品質なAIボイスを取得
    try {
        let textToSpeak = (type === 'rev') ? word : word.split('').join('  ');
        // ひらがなだと「は」を「わ」と読むことがあるため、カタカナに変換して発音を固定する
        textToSpeak = hiraganaToKatakana(textToSpeak);
        
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.OPEN_API_KEY || CONFIG.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: textToSpeak,
                voice: "onyx",
                speed: SPEECH_RATE
            })
        });

        if (response.ok) {
            const blob = await response.blob();
            await saveCachedAudio(cacheKey, blob);
            return blob;
        }
    } catch (e) {
        console.warn("Cloud TTS failed, falling back to local files", e);
    }

    // 3. 最終手段: ローカルアセット（以前の録音データ）
    const extensions = ['wav', 'mp3'];
    for (const ext of extensions) {
        let localPath;
        if (type === 'parts' || type === 'words') {
            localPath = `assets/audio/${type}/${word}.${ext}?v=5`;
        } else {
            const level = word.length;
            localPath = `assets/audio/${level}/${word}_${type}.${ext}?v=5`;
        }

        try {
            const response = await fetch(localPath);
            if (response.ok) return await response.blob();
        } catch (e) { /* ignore */ }
    }

    return null;
}

async function preloadAudios(questions) {
    const total = questions.length;
    elements.loadingSpinner.classList.remove('hidden');
    elements.btnStartAfterLoad.classList.add('hidden');
    
    for (let i = 0; i < total; i++) {
        const q = questions[i];
        elements.loadingStatus.textContent = `${i + 1} / ${total} 準備中...`;
        
        // 1. Preload individual characters for "Reading" phase (orig)
        // This ensures NO network latency during the 0.5s rhythm
        for (let char of q.ruby) {
            await getAudioBlob(char, 'orig');
        }
        
        // 2. Preload the FULL word (reversed) for "Master Answer"
        await getAudioBlob(q.reverse, 'rev');
        
        const progress = ((i + 1) / total) * 100;
        elements.loadingBar.style.width = `${progress}%`;
    }

    elements.loadingBar.style.width = '100%';
    elements.loadingStatus.textContent = 'すべての音声準備が完了しました';
    elements.loadingTitle.textContent = '準備が整いました！';
    elements.loadingSpinner.classList.add('hidden');
    elements.btnStartAfterLoad.classList.remove('hidden');
}

function startQuestion() {
    currentState.currentQuestion++;
    elements.labelProgress.textContent = `${currentState.currentQuestion} / ${QUESTIONS_PER_TURN}`;
    
    const q = currentState.allSequences[currentState.currentQuestion - 1];
    if (!q) {
        showResult();
        return;
    }
    
    currentState.originalWord = q.word;
    currentState.originalSequence = q.ruby;
    currentState.correctAnswer = q.reverse;
    
    // 背景画像の更新
    const dynamicBg = document.getElementById('dynamic-bg');
    if (dynamicBg && q.bg && q.bg !== 'default') {
        dynamicBg.style.backgroundImage = `url('assets/images/${q.bg}')`;
        dynamicBg.classList.add('active');
    } else if (dynamicBg) {
        dynamicBg.classList.remove('active');
    }
    
    setUIPhase('READING');
    elements.gameStatus.textContent = '準備中...';
    
    readSequence(q.ruby);
}

async function readSequence(textOrArray) {
    if (currentState.isReading) return;
    currentState.isReading = true;
    
    // Convert string to mora array if needed
    const sequence = Array.isArray(textOrArray) ? textOrArray : textOrArray.split('');
    
    // Clear flash area BEFORE showing container to avoid ghosts
    elements.flashCharacter.textContent = '';
    elements.flashContainer.classList.remove('hidden');
    elements.gameStatus.textContent = currentState.isSilent ? '文字を記憶してください...' : '音声データを読み込み中...';

    // 1. Preload Phase: Load all blobs first to prevent network race conditions
    const blobs = [];
    for (let unit of sequence) {
        const b = await getAudioBlob(unit, 'parts');
        blobs.push(b);
    }

    elements.gameStatus.textContent = currentState.isSilent ? '文字を記憶してください...' : '読み上げ中...';
    await sleep(800);
    playSE('start');

    // 2. Execution Phase: Play with strict timing
    try {
        for (let i = 0; i < sequence.length; i++) {
            if (!currentState.isReading) break;
            const unit = sequence[i];
            const blob = blobs[i];
            
            // Sync Visual
            elements.flashCharacter.textContent = currentState.isBlind ? '🔊' : unit;
            elements.flashCharacter.classList.remove('active');
            void elements.flashCharacter.offsetWidth; // Force reflow
            elements.flashCharacter.classList.add('active');

            // Fixed Beat: Play only if NOT silent
            if (!currentState.isSilent && blob) {
                playBlob(blob);
            }
            await sleep(RHYTHM_BEAT_MS); 
        }
    } catch (err) {
        console.error("Read sequence error:", err);
    } finally {
        currentState.isReading = false;
        elements.flashContainer.classList.add('hidden');
        elements.gameStatus.textContent = 'あなたの声を聞いています...';
        startRecording();
    }
}

async function playBlob(blob, fadeTime = 0.015) {
    const ctx = getPlaybackContext();
    
    try {
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        
        const gainNode = ctx.createGain();
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        const now = ctx.currentTime;
        
        // Envelope: Fade In
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(1, now + fadeTime);
        
        // Envelope: Fade Out (schedule at the end of the buffer)
        const duration = audioBuffer.duration;
        if (duration > fadeTime * 2) {
            gainNode.gain.setValueAtTime(1, now + duration - fadeTime);
            gainNode.gain.linearRampToValueAtTime(0, now + duration);
        }
        
        // UI Feedback
        elements.voiceIndicator.classList.add('active');
        source.onended = () => {
            elements.voiceIndicator.classList.remove('active');
            // Clean up
            GLOBAL_PLAYER.activeSources = GLOBAL_PLAYER.activeSources.filter(s => s !== source);
        };
        
        source.start(now);
        GLOBAL_PLAYER.activeSources.push(source);
        
        // Return a promise that resolves when the sound mostly finishes
        return new Promise(resolve => {
            setTimeout(resolve, Math.max(0, (duration * 1000) - 10));
        });
    } catch (err) {
        console.error("Playback error:", err);
    }
}

// Function to stop all currently playing debug/test sounds
function stopAllPlayback() {
    GLOBAL_PLAYER.activeSources.forEach(source => {
        try { source.stop(); } catch(e) {}
    });
    GLOBAL_PLAYER.activeSources = [];
}

async function speakAI(text, cacheKey) {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'tts-1',
            input: text,
            voice: "onyx",
            speed: SPEECH_RATE
        })
    });

    if (!response.ok) throw new Error('TTS API Error');

    const blob = await response.blob();
    currentState.currentAudioBlob = blob; 
    
    // Save to Persistent Cache
    await saveCachedAudio(cacheKey, blob);
    
    if (currentState.isSilent) return; // Skip in silent mode
    
    await playBlob(blob);
}

function repeatLastSpeech() {
    const q = currentState.allSequences[currentState.currentQuestion - 1];
    if (q) {
        readSequence(q.ruby);
    }
}

/**
 * Phase: Wait for user to manually start recording
 */
function prepareRecordingStart() {
    console.log("Waiting for user to start recording...");
    setUIPhase('WAIT_START');
    
    let timeLeft = WAIT_FOR_START_TIME / 1000;
    elements.recordingCountdown.textContent = timeLeft;

    if (currentState.countdownInterval) clearInterval(currentState.countdownInterval);
    currentState.countdownInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft >= 0) {
            elements.recordingCountdown.textContent = timeLeft;
        }
        if (timeLeft <= 0) {
            clearInterval(currentState.countdownInterval);
            console.warn("Manual start timeout!");
            setUIPhase('RETRY'); // Show recovery options (retry/skip)
        }
    }, 1000);
}

async function startRecording() {
    if (currentState.isRecording) return;
    
    // Clear the wait timer
    if (currentState.countdownInterval) clearInterval(currentState.countdownInterval);
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        currentState.mediaRecorder = new MediaRecorder(stream);
        currentState.audioChunks = [];
        currentState.mediaRecorder.ondataavailable = (event) => currentState.audioChunks.push(event.data);
        currentState.mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(currentState.audioChunks, { type: 'audio/webm' });
            
            if (currentState.cancelProcess) {
                elements.recordingStatus.textContent = '音声が検知できませんでした。もう一度お願いします！';
                elements.recordingStatus.classList.add('shake-text');
                setTimeout(() => {
                    elements.recordingStatus.classList.remove('shake-text');
                    setUIPhase('READING');
                    elements.gameStatus.textContent = '読み上げ直しています...';
                    currentState.isReading = false;
                    readSequence(currentState.originalSequence);
                }, 2000);
            } else {
                processAudio(audioBlob);
            }
            
            stream.getTracks().forEach(track => track.stop());
            
            // VADのクリーンアップ
            if (currentState.vadInterval) {
                cancelAnimationFrame(currentState.vadInterval);
                currentState.vadInterval = null;
            }
            if (currentState.vadContext) {
                currentState.vadContext.close();
                currentState.vadContext = null;
            }
            elements.voiceIndicator.classList.remove('active');
        };
        currentState.mediaRecorder.start();
        currentState.isRecording = true;
        
        setUIPhase('RECORDING');
        elements.gameStatus.textContent = "";
        
        // VAD (Voice Activity Detection) セットアップ
        if (!GLOBAL_PLAYER.audioCtx) {
            GLOBAL_PLAYER.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        const audioCtx = GLOBAL_PLAYER.audioCtx;
        if (audioCtx.state === 'suspended') audioCtx.resume();

        currentState.vadAnalyser = audioCtx.createAnalyser();
        currentState.vadAnalyser.fftSize = 2048; // Smooth waveform
        currentState.vadSource = audioCtx.createMediaStreamSource(stream);
        currentState.vadSource.connect(currentState.vadAnalyser);
        
        currentState.vadDataArray = new Uint8Array(currentState.vadAnalyser.frequencyBinCount);
        currentState.vadTimeDataArray = new Uint8Array(currentState.vadAnalyser.fftSize);
        
        const canvas = elements.gameWaveformCanvas;
        const ctx = canvas.getContext('2d');
        
        // Canvasのサイズを親要素に合わせる（遅延実行で確実に取得）
        setTimeout(() => {
            canvas.width = canvas.offsetWidth || 280;
            canvas.height = canvas.offsetHeight || 80;
        }, 50);
        
        let isSpeaking = false;
        let silenceStart = Date.now();
        const SILENCE_THRESHOLD_MS = 1000; // 1.0秒間の無音で終了
        const VOLUME_THRESHOLD = 10; // 音量しきい値 (0-255)
        const NO_SPEECH_TIMEOUT_MS = 5000; // 5秒間一度も発声がない場合のタイムアウト
        
        elements.recordingCountdown.textContent = SILENCE_THRESHOLD_MS / 1000;
        
        function detectSilence() {
            if (!currentState.isRecording) return;
            
            drawGameWaveform();
            currentState.vadAnalyser.getByteFrequencyData(currentState.vadDataArray);
            let sum = 0;
            for (let i = 0; i < currentState.vadDataArray.length; i++) {
                sum += currentState.vadDataArray[i];
            }
            let average = sum / currentState.vadDataArray.length;
            
            let silenceDuration = Date.now() - silenceStart;
            
            if (average > VOLUME_THRESHOLD) {
                // 発話中
                isSpeaking = true;
                silenceStart = Date.now();
                elements.voiceIndicator.classList.add('active'); // マイクが反応しているUI
                elements.recordingCountdown.textContent = "録音中...";
            } else {
                // 無音
                elements.voiceIndicator.classList.remove('active');
                if (isSpeaking) {
                    let timeLeft = Math.max(0, Math.ceil((SILENCE_THRESHOLD_MS - silenceDuration) / 1000));
                    elements.recordingCountdown.textContent = timeLeft;
                    
                    if (silenceDuration > SILENCE_THRESHOLD_MS) {
                        console.log("Silence detected, stopping recording auto.");
                        stopRecording();
                        return; // ループ終了
                    }
                } else {
                    // まだ一度も発声していない場合
                    if (silenceDuration > NO_SPEECH_TIMEOUT_MS) {
                        console.log("No speech detected for 5 seconds.");
                        stopRecording(true); // cancelProcessフラグを立てて終了
                        return;
                    }
                }
            }
            
            currentState.vadInterval = requestAnimationFrame(detectSilence);
        }

        function drawGameWaveform() {
            const canvas = elements.gameWaveformCanvas;
            if (!canvas || !currentState.vadAnalyser || !currentState.vadTimeDataArray) return;
            
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            const analyser = currentState.vadAnalyser;
            const dataArray = currentState.vadTimeDataArray;

            analyser.getByteTimeDomainData(dataArray);

            ctx.clearRect(0, 0, width, height);
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#a855f7'; // Neon Purple
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#a855f7';
            ctx.beginPath();

            const sliceWidth = width * 1.0 / dataArray.length;
            let x = 0;

            for (let i = 0; i < dataArray.length; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * height / 2;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
        }
        
        detectSilence(); // ループ開始

        // Timer for 20s recording maximum failsafe
        currentState.recordingTimer = setTimeout(() => { if (currentState.isRecording) stopRecording(); }, MAX_RECORDING_TIME);
    } catch (err) {
        console.error('Microphone access denied:', err);
        setUIPhase('RETRY');
    }
}

function stopRecording(cancelProcess = false) {
    if (currentState.mediaRecorder && currentState.isRecording) {
        currentState.cancelProcess = cancelProcess;
        currentState.mediaRecorder.stop();
        currentState.isRecording = false;
        if (currentState.recordingTimer) clearTimeout(currentState.recordingTimer);
        if (currentState.countdownInterval) clearInterval(currentState.countdownInterval);
        elements.recordingCountdown.textContent = '0';
        elements.micArea.classList.add('hidden');
        elements.recordingContainer.classList.remove('active');
    }
}

async function processAudio(audioBlob) {
    currentState.currentAudioBlob = audioBlob; // 録音データを結果画面用に保持
    elements.recordingStatus.textContent = '';
    elements.recordingStatus.classList.add('listening');
    try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'answer.wav');
        formData.append('model', 'whisper-1');
        formData.append('language', 'ja');
        
        // STRICT PROMPT: Focus on word only, forbid extra comments
        const hint = `余計な説明（「答えは」など）や句読点は削り、聞いた言葉「${currentState.correctAnswer}」のみをそのままひらがなで出力してください。`;
        formData.append('prompt', hint);
        
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${CONFIG.OPEN_API_KEY || CONFIG.OPENAI_API_KEY}` },
            body: formData
        });

        if (!response.ok) throw new Error('Whisper API Error');
        const data = await response.json();
        const transcription = data.text.trim();

        // 幻覚（Hallucination）の検知: Whisperが勝手に補完しがちな言葉
        const cleanedAnswer = normalizeText(transcription);
        
        // 正解のモーラ数（音の数）を取得
        const correctMoraCount = Array.isArray(currentState.correctAnswer) 
            ? currentState.correctAnswer.length 
            : getMoraCount(currentState.correctAnswer);
            
        const answerMoraCount = getMoraCount(transcription);
        
        console.log(`[Retry Check] transcription: "${transcription}", cleaned: "${cleanedAnswer}"`);
        console.log(`[Retry Check] answerMoraCount: ${answerMoraCount}, correctMoraCount: ${correctMoraCount}`);
        
        const hallucinations = ['視聴', 'チャンネル', '登録', 'お疲れ', '字幕', '評価', '高評価'];
        const isHallucination = hallucinations.some(word => transcription.includes(word)) || answerMoraCount > 20;

        // 文字数ベースの判定: 正解の文字数との差が2文字以上の場合はリトライ
        const diff = Math.abs(correctMoraCount - answerMoraCount);
        const isLengthError = diff >= 2;
        
        console.log(`[Retry Check] diff: ${diff}, isLengthError: ${isLengthError}, isHallucination: ${isHallucination}`);

        if (answerMoraCount < 1 || isHallucination || isLengthError) {
            console.log("Triggering auto-retry...");
            elements.recordingStatus.textContent = 'うまく聞き取れませんでした。もう一度お願いします！';
            elements.recordingStatus.classList.add('shake-text');
            
            setTimeout(() => {
                elements.recordingStatus.classList.remove('shake-text');
                setUIPhase('READING');
                elements.gameStatus.textContent = '読み上げ直しています...';
                currentState.isReading = false;
                readSequence(currentState.originalSequence);
            }, 2000);
            return;
        }

        submitAnswer(transcription);
    } catch (err) {
        console.error('Processing error:', err);
        elements.recordingStatus.textContent = '通信エラーが発生しました。もう一度試します。';
        elements.recordingStatus.classList.add('shake-text');
        
        setTimeout(() => {
            elements.recordingStatus.classList.remove('shake-text');
            startRecording();
        }, 2000);
    }
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

/**
 * Clean up text for both display and comparison
 * Removes AI fluff like "Answer is...", "It's...", quotes, and polite endings.
 */
function normalizeText(text) {
    if (!text) return "";
    let res = text.trim().toLowerCase();
    
    // 1. Remove Prefixes/Suffixes and Quotes/Brackets
    res = res.replace(/^(答えは|回答は|単語は|いうのは|それは|正解は)[、。\s:：]*/g, "");
    res = res.replace(/(です|でした|になります)[。\.!\?]*$/g, ""); 
    res = res.replace(/[「」『』（）\(\)\[\]"']/g, ""); 
    
    // 2. Converters
    const kanjiMap = { '〇': '0', '一': '1', '二': '2', '三': '3', '四': '4', '五': '5', '六': '6', '七': '7', '八': '8', '九': '9' };
    res = res.replace(/[〇一二三四五六七八九]/g, m => kanjiMap[m]);
    res = res.replace(/[０-９]/g, m => String.fromCharCode(m.charCodeAt(0) - 0xFEE0));
    res = res.replace(/[、。！?？\s\-・,._]/g, "");
    res = res.replace(/[^\u3041-\u3096a-z0-9]/g, ""); // ひらがな、英数字以外を徹底削除
    res = res.replace(/[^\u3041-\u30960-9]/g, ""); // ひらがなと数字以外を徹底削除
    return res;
}

/**
 * 日本語の音の数（モーラ数）を正確にカウントする
 * 「きょう」→ 2音、「きよう」→ 3音
 */
function getMoraCount(text) {
    if (!text) return 0;
    // 1. カタカナをひらがなに変換
    let hira = katakanaToHiragana(text);
    // 2. 余計な記号を削除
    hira = normalizeText(hira);
    // 3. 小書き文字（ゃゅょ、およびカタカナの ァィゥェォ）と「ー」を考慮
    // 基本的に小書き文字は前の文字とセットで1音なので、カウントから除外する
    const smallChars = /[ゃゅょぁぃぅぇぉ]/g;
    return hira.length - (hira.match(smallChars) || []).length;
}

function submitAnswer(rawAnswer) {
    setUIPhase('FEEDBACK');
    
    // Use cleaned text for both comparison AND display to remove "Answer is..."
    const cleanedAnswer = normalizeText(rawAnswer);
    const normalizedCorrect = normalizeText(currentState.correctAnswer);
    const isCorrect = (cleanedAnswer === normalizedCorrect) && (cleanedAnswer.length === normalizedCorrect.length);

    if (isCorrect) {
        playSE('correct'); // ピンポン♪
        currentState.score++;
        if(elements.feedbackBadge) {
            elements.feedbackBadge.textContent = 'お見事';
            elements.feedbackBadge.className = 'feedback-badge minimal-badge hanko-stamp';
            void elements.feedbackBadge.offsetWidth; // Force reflow
            elements.feedbackBadge.classList.add('animate');
        }
        if (vapiInstance) {
            vapiInstance.send({
                type: "add-message",
                message: { role: "system", content: "ユーザーが正解しました！一言で褒めてください。" }
            });
        }
        if (elements.userAnswerContainer) {
            elements.userAnswerContainer.classList.add('hidden');
        }
    } else {
        playSE('wrong'); // ブブー
        if(elements.feedbackBadge) {
            elements.feedbackBadge.textContent = '✕';
            elements.feedbackBadge.className = 'feedback-badge minimal-badge wrong-stamp';
            void elements.feedbackBadge.offsetWidth; // Force reflow
            elements.feedbackBadge.classList.add('animate');
        }
        if (vapiInstance) {
            vapiInstance.send({
                type: "add-message",
                message: { role: "system", content: `ユーザーが不正解でした（正解は ${currentState.correctAnswer}）。一言で励ましてください。` }
            });
        }
        if (elements.userAnswerContainer) {
            elements.userAnswerContainer.classList.remove('hidden');
        }
        if (elements.displayUserAnswer) {
            elements.displayUserAnswer.textContent = cleanedAnswer || '(無音・認識不能)';
        }
    }
    
    if(elements.displayCorrectReverse) {
        elements.displayCorrectReverse.textContent = katakanaToHiragana(currentState.correctAnswer);
    }

    saveLog({ 
        level: currentState.currentLevel, 
        original: katakanaToHiragana(currentState.originalWord), 
        correct: katakanaToHiragana(currentState.correctAnswer), 
        user_answer: katakanaToHiragana(cleanedAnswer||''), 
        is_correct: isCorrect 
    });

    // 1ターン内の履歴として保持（録音再生用）
    let audioUrl = null;
    if (currentState.currentAudioBlob) {
        audioUrl = URL.createObjectURL(currentState.currentAudioBlob);
    }
    currentState.turnLogs.push({
        original: katakanaToHiragana(currentState.originalWord),
        user_answer: katakanaToHiragana(cleanedAnswer || '(無音/スキップ)'),
        is_correct: isCorrect,
        audioUrl: audioUrl
    });
    
    elements.labelScore.textContent = `Score: ${currentState.score}`;
    elements.btnNext.textContent = currentState.currentQuestion >= QUESTIONS_PER_TURN ? '結果を見る' : '次へ';
    
    // Auto-advance after 3 seconds for fully hands-free experience
    if (currentState.autoAdvanceTimer) clearTimeout(currentState.autoAdvanceTimer);
    currentState.autoAdvanceTimer = setTimeout(() => {
        nextQuestion();
    }, 3000);
}

function nextQuestion() {
    if (currentState.autoAdvanceTimer) clearTimeout(currentState.autoAdvanceTimer);
    if (currentState.currentQuestion >= QUESTIONS_PER_TURN) showResult(); else startQuestion();
}

function showResult() {
    const accuracy = Math.round((currentState.score / QUESTIONS_PER_TURN) * 100);
    showScreen('result');
    elements.accuracyText.textContent = `${accuracy}%`;
    elements.accuracyPath.style.strokeDasharray = `${accuracy}, 100`;
    let msg = accuracy === 100 ? '全問正解！🎉' : accuracy >= 80 ? '素晴らしい！✨' : accuracy >= 50 ? 'ナイス！' : '継続は力なり💤';
    elements.resultMessage.textContent = msg;

    // 履歴リストの生成
    const listEl = document.getElementById('result-history-list');
    if (listEl) {
        listEl.innerHTML = '';
        currentState.turnLogs.forEach((log, index) => {
            const item = document.createElement('div');
            item.className = 'history-item';
            
            const leftDiv = document.createElement('div');
            leftDiv.className = 'history-item-left';
            leftDiv.innerHTML = `
                <span class="history-index">${index + 1}.</span>
                <span class="history-icon ${log.is_correct ? 'correct' : 'wrong'}">${log.is_correct ? '◯' : '✕'}</span>
                <div class="history-text">
                    <span class="history-word" style="white-space: nowrap;">${log.original}</span>
                    <span class="history-answer" style="white-space: nowrap;">${log.user_answer}</span>
                </div>
            `;
            item.appendChild(leftDiv);

            if (log.audioUrl) {
                const btn = document.createElement('button');
                btn.className = 'btn-history-play';
                btn.innerHTML = '▶';
                btn.title = '自分の録音を聞く';
                btn.onclick = () => {
                    const audio = new Audio(log.audioUrl);
                    audio.play();
                };
                item.appendChild(btn);
            }
            listEl.appendChild(item);
        });
    }
}

function skipQuestion() {
    if (currentState.isRecording) stopRecording();
    submitAnswer('(スキップしました)');
}

function saveLog(entry) {
    try {
        let logs = JSON.parse(localStorage.getItem('reversa_logs') || '[]');
        logs.unshift({ timestamp: new Date().toLocaleString('ja-JP'), ...entry });
        if (logs.length > 50) logs = logs.slice(0, 50);
        localStorage.setItem('reversa_logs', JSON.stringify(logs));
    } catch (e) { console.error('Log save error:', e); }
}

function exportLogs() {
    try {
        const logs = JSON.parse(localStorage.getItem('reversa_logs') || '[]');
        if (logs.length === 0) { alert('保存されたログはありません。'); return; }
        const header = ['日時', 'レベル', '問題(正順)', '正解(逆順)', 'あなたの回答', '判定'];
        const csvContent = '\uFEFF' + [header.join(','), ...logs.map(l => [`"${l.timestamp}"`, l.level, `"${l.original}"`, `"${l.correct}"`, `"${l.user_answer||''}"`, l.is_correct?'正解':'不正解'].join(','))].join('\n');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
        link.download = `reversa_log_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    } catch (e) { console.error('Log export error:', e); }
}

/**
 * Play the master correct answer audio (Concatenation of Moras)
 */
async function playMasterAudio() {
    const q = currentState.allSequences[currentState.currentQuestion - 1];
    if (!q) return;
    
    // Play concatenated moras from the 'reverse' array or string
    const sequence = Array.isArray(q.reverse) ? q.reverse : q.reverse.split('');
    
    // Preload
    const blobs = [];
    for (let unit of sequence) {
        blobs.push(await getAudioBlob(unit, 'parts'));
    }
    
    const overlap = 20; // 20ms crossfade overlap
    for (let i = 0; i < sequence.length; i++) {
        const blob = blobs[i];
        if (blob) playBlob(blob);
        await sleep(RHYTHM_BEAT_MS - overlap); // Pre-trigger next sound for smoothness
    }
}

// --- Developer Studio Engine ---
const DEV_STATE = {
    tab: 'moras',
    target: null,
    moraList: 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'.split(''),
    pilotIndex: 0,
    pilotList: [...PILOT_WORDS, ...PILOT_NUMBERS],
    recorder: null,
    audioChunks: [],
    blob: null
};

function initDevMode() {
    switchDevTab('moras');
}

function switchDevTab(tabId) {
    DEV_STATE.tab = tabId;
    
    // UI Update
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    elements.pilotProgress.classList.toggle('hidden', tabId !== 'pilot');
    refreshDevList();
}

function refreshDevList() {
    elements.devListContainer.innerHTML = '';
    const list = DEV_STATE.tab === 'moras' ? DEV_STATE.moraList : 
                 DEV_STATE.tab === 'pilot' ? DEV_STATE.pilotList : 
                 Array.from(new Set(QUESTION_DATABASE[3].concat(QUESTION_DATABASE[4], QUESTION_DATABASE[5]).map(q => q.word)));
    
    list.forEach(item => {
        const div = document.createElement('div');
        div.className = 'mora-item';
        div.textContent = item;
        div.onclick = () => selectDevTarget(item);
        elements.devListContainer.appendChild(div);
    });
}

function selectDevTarget(word) {
    DEV_STATE.target = word;
    
    // Wrap each character for highlighting
    elements.devTargetText.innerHTML = '';
    word.split('').forEach((char, i) => {
        const span = document.createElement('span');
        span.className = 'char-unit';
        span.textContent = char;
        elements.devTargetText.appendChild(span);
    });

    elements.btnRecordDev.classList.remove('hidden');
    elements.btnRecordRhythm.classList.remove('hidden');
    elements.btnPlayDev.classList.add('hidden');
    elements.btnSaveDev.classList.add('hidden');
    elements.waveformPreview.classList.add('hidden');

    if (DEV_STATE.tab === 'pilot') {
        updatePilotUI();
    }
}

function updatePilotUI() {
    const total = DEV_STATE.pilotList.length;
    const current = DEV_STATE.pilotIndex + 1;
    elements.pilotStatus.textContent = `${current} / ${total}`;
    elements.pilotBar.style.width = `${(current / total) * 100}%`;
}

async function toggleDevRecording() {
    if (!DEV_STATE.target) return alert('ターゲットを選んでください');
    
    if (DEV_STATE.recorder && DEV_STATE.recorder.state === 'recording') {
        DEV_STATE.recorder.stop();
        elements.btnRecordDev.textContent = '🔴 録音開始';
        elements.btnRecordDev.classList.remove('recording');
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        DEV_STATE.recorder = new MediaRecorder(stream);
        DEV_STATE.chunks = [];
        DEV_STATE.recorder.ondataavailable = e => DEV_STATE.chunks.push(e.data);
        DEV_STATE.recorder.onstop = () => {
            DEV_STATE.blob = new Blob(DEV_STATE.chunks, { type: 'audio/wav' });
            elements.btnPlayDev.classList.remove('hidden');
            elements.btnSaveDev.classList.remove('hidden');
            elements.devStatus.textContent = '録音完了。確認して保存してください。';
            stream.getTracks().forEach(t => t.stop());
        };
        DEV_STATE.recorder.start();
        elements.btnRecordDev.textContent = '⏹ 停止';
        elements.btnRecordDev.classList.add('recording');
        elements.devStatus.textContent = '録音中...';
        
        visualizeDevWaveform(stream);
    } catch (err) {
        console.error(err);
    }
}

async function startRhythmRecording() {
    if (!DEV_STATE.target) return alert('ターゲットを選んでください');
    
    elements.metronomeArea.classList.remove('hidden');
    elements.waveformPreview.classList.add('hidden');
    elements.btnRecordRhythm.disabled = true;
    elements.devStatus.textContent = 'リズムに合わせて準備...';
    
    const BEAT_MS = RHYTHM_BEAT_MS;
    const pendulum = document.querySelector('.pendulum');
    pendulum.style.animationDuration = `${BEAT_MS/1000}s`;
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        DEV_STATE.recorder = new MediaRecorder(stream);
        const chunks = [];
        DEV_STATE.recorder.ondataavailable = e => chunks.push(e.data);
        
        for (let i = 3; i > 0; i--) {
            elements.rhythmCountdown.textContent = i;
            elements.beatIndicator.classList.add('hit');
            setTimeout(() => elements.beatIndicator.classList.remove('hit'), 100);
            pendulum.classList.add('active');
            await sleep(BEAT_MS);
        }
        
        await sleep(BEAT_MS - 50); 
        DEV_STATE.recorder.start();
        
        elements.rhythmCountdown.textContent = 'GO!';
        elements.beatIndicator.classList.add('hit');
        elements.devStatus.textContent = '発声してください！';
        
        visualizeDevWaveform(stream);
        
        const totalDuration = (DEV_STATE.target.length * RHYTHM_BEAT_MS) + 500;
        
        // --- Highlight Guidance Loop ---
        let startTime = Date.now() + 50;
        const highlightInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const index = Math.floor(elapsed / RHYTHM_BEAT_MS);
            const chars = elements.devTargetText.querySelectorAll('.char-unit');
            
            chars.forEach((c, i) => {
                c.classList.toggle('highlight', i === index);
            });

            if (elapsed >= totalDuration) {
                clearInterval(highlightInterval);
                chars.forEach(c => c.classList.remove('highlight'));
            }
        }, 50);

        await sleep(totalDuration); 
        DEV_STATE.recorder.stop();
        elements.rhythmCountdown.textContent = '';
        elements.metronomeArea.classList.add('hidden');
        pendulum.classList.remove('active');
        elements.btnRecordRhythm.disabled = false;

        DEV_STATE.recorder.onstop = async () => {
            try {
                elements.devStatus.textContent = '音声解析中...';
                const fullBlob = new Blob(chunks, { type: DEV_STATE.recorder.mimeType });
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const arrayBuffer = await fullBlob.arrayBuffer();
                const fullAudioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                
                const startOffset = 0.02; 
                const duration = (DEV_STATE.target.length * RHYTHM_BEAT_MS) / 1000; 
                
                const trimmedBuffer = audioCtx.createBuffer(
                    fullAudioBuffer.numberOfChannels,
                    audioCtx.sampleRate * duration,
                    audioCtx.sampleRate
                );
                
                for (let channel = 0; channel < fullAudioBuffer.numberOfChannels; channel++) {
                    const nowBuffering = trimmedBuffer.getChannelData(channel);
                    const fullData = fullAudioBuffer.getChannelData(channel);
                    const startSample = Math.floor(startOffset * audioCtx.sampleRate);
                    for (let i = 0; i < nowBuffering.length; i++) {
                        nowBuffering[i] = fullData[startSample + i] || 0;
                    }
                }
                
                DEV_STATE.blob = exportWAV(trimmedBuffer);
                elements.waveformPreview.classList.remove('hidden');
                drawStaticWaveform(trimmedBuffer);
                
                elements.btnPlayDev.classList.remove('hidden');
                elements.btnSaveDev.classList.remove('hidden');
                elements.devStatus.textContent = 'リズム録音完了！波形を確認してください。';
                stream.getTracks().forEach(t => t.stop());
            } catch (err) {
                console.error("Rhythm recording processing error:", err);
                elements.devStatus.textContent = '解析失敗: ' + err.message;
                stream.getTracks().forEach(t => t.stop());
            }
        };
        
    } catch (err) {
        console.error(err);
        elements.btnRecordRhythm.disabled = false;
        elements.metronomeArea.classList.add('hidden');
    }
}

function drawStaticWaveform(buffer) {
    const canvas = elements.waveformCanvasStatic;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    const height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height/2);
    ctx.lineTo(width, height/2);
    ctx.stroke();

    const data = buffer.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < data.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > peak) peak = abs;
    }
    const scale = peak > 0.01 ? (0.9 / peak) : 1;

    ctx.beginPath();
    ctx.strokeStyle = '#34d399';
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#34d399';
    ctx.lineWidth = 2;
    
    const step = Math.ceil(data.length / width);
    const amp = height / 2;
    
    ctx.moveTo(0, amp);
    for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
            const datum = data[(i * step) + j] || 0;
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        ctx.lineTo(i, (1 + min * scale) * amp);
        ctx.lineTo(i, (1 + max * scale) * amp);
    }
    ctx.stroke();
}

function playCurrentDevRecording() {
    if (DEV_STATE.blob) {
        const url = URL.createObjectURL(DEV_STATE.blob);
        new Audio(url).play();
    }
}

async function saveCurrentDevRecording() {
    if (!DEV_STATE.blob || !DEV_STATE.target) return;
    
    try {
        elements.devStatus.textContent = '保存中（形式変換中）...';
        
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await DEV_STATE.blob.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const wavBlob = exportWAV(audioBuffer);

        const params = new URLSearchParams({
            filename: `${DEV_STATE.target}.wav`,
            folder: DEV_STATE.tab === 'moras' ? 'parts' : 'orig'
        });

        const res = await fetch(`${DEV_SERVER_URL}/save_audio?${params.toString()}`, {
            method: 'POST',
            body: wavBlob
        });

        if (res.ok) {
            elements.devStatus.textContent = '保存完了！✨';
            elements.btnSaveDev.classList.add('hidden');
            
            // --- Auto-Advance for Pilot Mode ---
            if (DEV_STATE.tab === 'pilot') {
                if (DEV_STATE.pilotIndex < DEV_STATE.pilotList.length - 1) {
                    DEV_STATE.pilotIndex++;
                    setTimeout(() => {
                        selectDevTarget(DEV_STATE.pilotList[DEV_STATE.pilotIndex]);
                        elements.devStatus.textContent = `次は: ${DEV_STATE.pilotList[DEV_STATE.pilotIndex]}`;
                    }, 1000);
                } else {
                    elements.devStatus.textContent = '全40件の録音が完了しました！お疲れ様でした！✨';
                }
            }
            
            const currentItem = Array.from(document.querySelectorAll('.mora-item'))
                .find(el => el.textContent === DEV_STATE.target);
            if (currentItem) currentItem.classList.add('done');
        } else {
            const errData = await res.json();
            throw new Error(errData.message || 'Server error');
        }
    } catch (err) {
        console.error("Save error:", err);
        elements.devStatus.textContent = `保存失敗: ${err.message}.`;
    }
}

// --- Minimal JS WAV Encoder (no libraries) ---
function exportWAV(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const blockAlign = 1 * bitDepth / 8; // Force Mono for output header
    const byteRate = sampleRate * blockAlign;
    
    // Support stereo mixing to mono
    let samples;
    if (audioBuffer.numberOfChannels === 1) {
        samples = audioBuffer.getChannelData(0);
    } else {
        const ch0 = audioBuffer.getChannelData(0);
        const ch1 = audioBuffer.getChannelData(1);
        samples = new Float32Array(ch0.length);
        for (let i = 0; i < ch0.length; i++) {
            samples[i] = (ch0[i] + (ch1[i] || 0)) / 2;
        }
    }
    const dataLen = samples.length * (bitDepth / 8);
    const buffer = new ArrayBuffer(44 + dataLen);
    const view = new DataView(buffer);

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 36 + dataLen, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, format, true);
    /* channel count */
    view.setUint16(22, 1, true); // Mono
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, byteRate, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, blockAlign, true);
    /* bits per sample */
    view.setUint16(34, bitDepth, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, dataLen, true);

    // Write PCM samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

async function testMoraConcatenation(text) {
    if (currentState.isReading) return; // Guard
    currentState.isReading = true;

    const sequence = text.split('');
    elements.devStatus.textContent = '読み込み中...';
    
    // Preload all moras
    const blobs = [];
    for (let unit of sequence) {
        blobs.push(await getAudioBlob(unit, 'parts'));
    }

    elements.devStatus.textContent = '連結テスト再生中...';
    stopAllPlayback(); // Clear previous tests
    await sleep(100); // Small warmup delay
    
    const overlap = 20; // 20ms crossfade
    for (let i = 0; i < sequence.length; i++) {
        const unit = sequence[i];
        const blob = blobs[i];
        
        // Visualize: Update the big display with the current character
        elements.devTargetText.textContent = unit;
        console.log(`Testing concatenation: Playing [${unit}]`);

        if (blob) {
            playBlob(blob);
        } else {
            console.warn(`Asset not found for ${unit}`);
        }
        await sleep(RHYTHM_BEAT_MS - overlap); 
    }
    // Final wait for the last sound to finish
    await sleep(overlap + 500);
    elements.devStatus.textContent = 'テスト再生完了';
    elements.devTargetText.textContent = DEV_STATE.target || '準備中'; 
    currentState.isReading = false;
}

function visualizeDevWaveform(stream) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume(); // Ensure context is active

    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const canvas = elements.waveformCanvas;
    const canvasCtx = canvas.getContext('2d');
    
    // Set internal resolution to match display size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
        if (!DEV_STATE.recorder || (DEV_STATE.recorder.state !== 'recording' && DEV_STATE.recorder.state !== 'inactive')) {
            // Wait slightly if state is just changing, but otherwise stop
            if (!DEV_STATE.recorder) return;
        }
        if (DEV_STATE.recorder.state === 'inactive') return; // Stop drawing when done
        
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for(let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] / 2;
            canvasCtx.fillStyle = `rgb(${barHeight + 100}, 50, 255)`;
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }
    draw();
}

window.onload = init;

/**
 * Manage UI Phases and ensure timers are cleared
 */
function setUIPhase(phase) {
    // 1. Cleanup all active timers
    if (currentState.recordingTimer) clearTimeout(currentState.recordingTimer);
    if (currentState.countdownInterval) clearInterval(currentState.countdownInterval);
    
    // 2. Default hidden states for shared components
    const elementsToHide = [
        elements.voiceIndicator,
        elements.recordingContainer,
        elements.feedbackPanel,
        elements.actionChoiceGroup,
        elements.btnStartRecord,
        elements.btnStopRecord,
        elements.countdownArea
    ];
    elementsToHide.forEach(el => {
        if (el) el.classList.add('hidden');
    });
    
    if (elements.recordingContainer) elements.recordingContainer.classList.remove('active');
    if (elements.recordingStatus) elements.recordingStatus.classList.remove('listening');

    // 3. Apply phase-specific display logic
    switch(phase) {
        case 'READING':
            if (elements.voiceIndicator) elements.voiceIndicator.classList.remove('hidden');
            break;
        case 'WAIT_START':
            if (elements.recordingContainer) elements.recordingContainer.classList.remove('hidden');
            if (elements.btnStartRecord) elements.btnStartRecord.classList.remove('hidden');
            if (elements.recordingStatus) {
                elements.recordingStatus.textContent = '準備ができたら開始してください';
                elements.recordingStatus.classList.remove('hidden');
            }
            if (elements.countdownArea) elements.countdownArea.classList.remove('hidden');
            break;
        case 'RECORDING':
            if (elements.recordingContainer) {
                elements.recordingContainer.classList.remove('hidden');
                elements.recordingContainer.classList.add('active');
            }
            if (elements.micArea) elements.micArea.classList.remove('hidden');
            if (elements.countdownArea) elements.countdownArea.classList.remove('hidden');
            if (elements.recordingStatus) {
                elements.recordingStatus.textContent = '';
                elements.recordingStatus.classList.add('listening');
                elements.recordingStatus.classList.remove('hidden');
            }
            if (elements.btnStopRecord) elements.btnStopRecord.classList.remove('hidden');
            break;
        case 'RETRY':
            if (elements.recordingContainer) elements.recordingContainer.classList.remove('hidden');
            if (elements.actionChoiceGroup) elements.actionChoiceGroup.classList.remove('hidden');
            if (elements.btnRetryRecord) elements.btnRetryRecord.classList.remove('hidden');
            if (elements.recordingStatus) elements.recordingStatus.classList.remove('hidden');
            if (elements.countdownArea) elements.countdownArea.classList.add('hidden');
            break;
        case 'FEEDBACK':
            if (elements.feedbackPanel) elements.feedbackPanel.classList.remove('hidden');
            break;
        case 'IDLE':
        default:
            // All hidden
            break;
    }
}
