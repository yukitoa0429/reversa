// Reversa - ゲームコアロジック
import { currentState } from './state.js';
import { elements, showScreen } from './ui.js';
import { 
    initAudio,
    playSE, 
    playBlob, 
    getAudioBlob,
    startRecording,
    stopRecording
} from './audio.js';
import { normalizeText, katakanaToHiragana, sleep } from './utils.js';

// 1セットの問題数
const QUESTIONS_PER_TURN = 10;

/**
 * 次の問題を抽選
 */
function getNextQuestion(theme) {
    const db = window.QUESTION_DATABASE || {};
    const pool = db[theme] || [];
    if (pool.length > 0) {
        let availablePool = pool.filter(q => !currentState.recentQuestions.includes(q.word));
        if (availablePool.length === 0) {
            availablePool = pool;
            currentState.recentQuestions = [];
        }
        const randomIndex = Math.floor(Math.random() * availablePool.length);
        const selectedQuestion = availablePool[randomIndex];
        currentState.recentQuestions.push(selectedQuestion.word);
        if (currentState.recentQuestions.length > 5) currentState.recentQuestions.shift();
        return selectedQuestion;
    }
    return null;
}

/**
 * ゲームのセットアップ
 */
async function startGame(theme) {
    console.log(`Starting game: ${theme}`);
    currentState.currentLevel = theme;
    currentState.currentQuestion = 0;
    currentState.score = 0;
    
    // 設定の読み込み
    currentState.isSilent = elements.checkSilent ? elements.checkSilent.checked : false;
    currentState.isBlind = elements.checkBlind ? elements.checkBlind.checked : true;
    currentState.useNaturalVoice = elements.checkNatural ? elements.checkNatural.checked : true;

    // 問題リストの作成
    currentState.allSequences = [];
    for (let i = 0; i < QUESTIONS_PER_TURN; i++) {
        const q = getNextQuestion(theme);
        if (q) currentState.allSequences.push(q);
    }

    showScreen('loading');
    await preloadAudios(currentState.allSequences);
}

/**
 * 音声の事前準備
 */
async function preloadAudios(questions) {
    const total = questions.length;
    if (elements.loadingSpinner) elements.loadingSpinner.classList.remove('hidden');
    
    for (let i = 0; i < total; i++) {
        const q = questions[i];
        if (elements.loadingStatus) elements.loadingStatus.textContent = `${i + 1} / ${total} 準備中...`;
        await getAudioBlob(q.word, 'orig');
        await getAudioBlob(q.reverse, 'rev');
        const progress = ((i + 1) / total) * 100;
        if (elements.loadingBar) elements.loadingBar.style.width = `${progress}%`;
    }
    if (elements.loadingStatus) elements.loadingStatus.textContent = '準備完了！';
    if (elements.loadingSpinner) elements.loadingSpinner.classList.add('hidden');
    if (elements.btnStartAfterLoad) elements.btnStartAfterLoad.classList.remove('hidden');
}

/**
 * 出題開始
 */
function startQuestion() {
    currentState.currentQuestion++;
    if (elements.labelProgress) elements.labelProgress.textContent = `${currentState.currentQuestion} / ${QUESTIONS_PER_TURN}`;
    if (elements.labelLevel) elements.labelLevel.textContent = currentState.currentLevel.toUpperCase();
    
    const q = currentState.allSequences[currentState.currentQuestion - 1];
    if (!q) {
        showResult();
        return;
    }
    
    currentState.originalWord = q.word;
    currentState.correctAnswer = q.reverse;
    
    showScreen('game');
    playQuestion(q);
}

/**
 * 問題の読み上げ
 */
async function playQuestion(q) {
    // インジケーター表示
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
    
    // 録音開始（フェーズ切り替え）
    if (elements.recordingContainer) elements.recordingContainer.classList.remove('hidden');
    startRecording();
}

/**
 * 回答提出
 */
function submitAnswer(rawAnswer) {
    if (elements.recordingContainer) elements.recordingContainer.classList.add('hidden');
    if (elements.feedbackPanel) elements.feedbackPanel.classList.remove('hidden');

    const cleanedAnswer = normalizeText(rawAnswer);
    const normalizedCorrect = normalizeText(currentState.correctAnswer);
    const isCorrect = (cleanedAnswer === normalizedCorrect);

    if (isCorrect) {
        playSE('correct');
        currentState.score++;
        if (elements.feedbackBadge) elements.feedbackBadge.textContent = '正解！';
    } else {
        playSE('wrong');
        if (elements.feedbackBadge) elements.feedbackBadge.textContent = '✕';
    }
    
    if (elements.displayCorrectReverse) elements.displayCorrectReverse.textContent = katakanaToHiragana(currentState.correctAnswer);
    if (elements.displayUserAnswer) elements.displayUserAnswer.textContent = cleanedAnswer || '(無音)';
    if (elements.labelScore) elements.labelScore.textContent = `Score: ${currentState.score}`;
}

/**
 * 結果表示
 */
function showResult() {
    const accuracy = Math.round((currentState.score / QUESTIONS_PER_TURN) * 100);
    showScreen('result');
    if (elements.accuracyText) elements.accuracyText.textContent = `${accuracy}%`;
}

/**
 * アプリ初期化
 */
function initApp() {
    console.log('Reversa Initializing...');
    initAudio().catch(err => console.error("Audio Init Failed:", err));

    // ボタンの紐付け
    if (elements.btnBeginner) elements.btnBeginner.onclick = () => startGame('beginner');
    if (elements.btnIntermediate) elements.btnIntermediate.onclick = () => startGame('intermediate');
    if (elements.btnAdvanced) elements.btnAdvanced.onclick = () => startGame('advanced');
    
    if (elements.btnStartAfterLoad) elements.btnStartAfterLoad.onclick = () => startQuestion();
    if (elements.btnNext) elements.btnNext.onclick = () => {
        if (elements.feedbackPanel) elements.feedbackPanel.classList.add('hidden');
        if (currentState.currentQuestion >= QUESTIONS_PER_TURN) showResult();
        else startQuestion();
    };
    if (elements.btnRestart) elements.btnRestart.onclick = () => location.reload(); // 確実にリセット
    if (elements.openDevBtn) elements.openDevBtn.onclick = () => showScreen('dev');
    if (elements.devBackBtn) elements.devBackBtn.onclick = () => showScreen('home');

    console.log('Reversa System Ready.');
}

// 起動イベント登録
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
