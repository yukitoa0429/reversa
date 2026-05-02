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

// グローバル変数の取得 (questions.js が先に読み込まれている前提)
const QUESTIONS_PER_TURN = 10;

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

async function startGame(theme) {
    console.log(`Game Start: ${theme}`);
    currentState.currentLevel = theme;
    currentState.currentQuestion = 0;
    currentState.score = 0;
    
    // UIからの設定取得
    currentState.isSilent = elements.checkSilent ? elements.checkSilent.checked : false;
    currentState.isBlind = elements.checkBlind ? elements.checkBlind.checked : true;
    currentState.useNaturalVoice = elements.checkNatural ? elements.checkNatural.checked : true;

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
    
    for (let i = 0; i < total; i++) {
        const q = questions[i];
        if (elements.loadingStatus) elements.loadingStatus.textContent = `${i + 1} / ${total} 準備中...`;
        await getAudioBlob(q.word, 'orig');
        await getAudioBlob(q.reverse, 'rev');
        const progress = ((i + 1) / total) * 100;
        if (elements.loadingBar) elements.loadingBar.style.width = `${progress}%`;
    }
    if (elements.loadingStatus) elements.loadingStatus.textContent = '準備完了';
    if (elements.loadingSpinner) elements.loadingSpinner.classList.add('hidden');
    if (elements.btnStartAfterLoad) elements.btnStartAfterLoad.classList.remove('hidden');
}

function startQuestion() {
    currentState.currentQuestion++;
    if (elements.labelProgress) elements.labelProgress.textContent = `${currentState.currentQuestion} / ${QUESTIONS_PER_TURN}`;
    
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

async function playQuestion(q) {
    if (!currentState.isBlind && elements.flashContainer) {
        elements.flashContainer.classList.remove('hidden');
        elements.flashCharacter.textContent = '?';
    }

    const blob = await getAudioBlob(q.word, 'orig');
    if (blob) await playBlob(blob);
    await sleep(1500);

    if (elements.flashContainer) elements.flashContainer.classList.add('hidden');
    startRecording();
}

function submitAnswer(rawAnswer) {
    const cleanedAnswer = normalizeText(rawAnswer);
    const normalizedCorrect = normalizeText(currentState.correctAnswer);
    const isCorrect = (cleanedAnswer === normalizedCorrect);

    if (isCorrect) {
        playSE('correct');
        currentState.score++;
    } else {
        playSE('wrong');
    }
    
    if (elements.btnNext) elements.btnNext.textContent = currentState.currentQuestion >= QUESTIONS_PER_TURN ? '結果' : '次へ';
}

function showResult() {
    const accuracy = Math.round((currentState.score / QUESTIONS_PER_TURN) * 100);
    showScreen('result');
    if (elements.accuracyText) elements.accuracyText.textContent = `${accuracy}%`;
}

function initApp() {
    console.log('Reversa System Ready.');
    initAudio().catch(console.error);

    if (elements.btnBeginner) elements.btnBeginner.onclick = () => startGame('beginner');
    if (elements.btnIntermediate) elements.btnIntermediate.onclick = () => startGame('intermediate');
    if (elements.btnAdvanced) elements.btnAdvanced.onclick = () => startGame('advanced');
    
    if (elements.btnStartAfterLoad) elements.btnStartAfterLoad.onclick = () => startQuestion();
    if (elements.btnRestart) elements.btnRestart.onclick = () => showScreen('home');
    if (elements.openDevBtn) elements.openDevBtn.onclick = () => showScreen('dev');
    if (elements.devBackBtn) elements.devBackBtn.onclick = () => showScreen('home');

    showScreen('home');
}

// 起動
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
