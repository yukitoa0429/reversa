// Reversa - ゲームコアロジック
import { currentState } from './state.js';
import { elements, showScreen } from './ui.js';
import { 
    startRecording, 
    stopRecording, 
    playSE, 
    playBlob, 
    getAudioBlob 
} from './audio.js';
import { normalizeText, katakanaToHiragana, sleep } from './utils.js';

// グローバル変数の安全な取得
const getDB = () => window.QUESTION_DATABASE || {};
const QUESTIONS_PER_TURN = 10;
const RHYTHM_BEAT_MS = 500;

function getNextQuestion(theme) {
    const db = getDB();
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
    console.log(`Starting game with theme: ${theme}`);
    currentState.currentLevel = theme;
    currentState.currentQuestion = 0;
    currentState.score = 0;
    currentState.turnLogs = [];
    
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
    if (elements.btnStartAfterLoad) elements.btnStartAfterLoad.classList.add('hidden');
    
    for (let i = 0; i < total; i++) {
        const q = questions[i];
        if (elements.loadingStatus) elements.loadingStatus.textContent = `${i + 1} / ${total} 準備中...`;
        for (let char of q.ruby) await getAudioBlob(char, 'orig');
        await getAudioBlob(q.reverse, 'rev');
        const progress = ((i + 1) / total) * 100;
        if (elements.loadingBar) elements.loadingBar.style.width = `${progress}%`;
    }
    if (elements.loadingBar) elements.loadingBar.style.width = '100%';
    if (elements.loadingStatus) elements.loadingStatus.textContent = '準備完了';
    if (elements.loadingSpinner) elements.loadingSpinner.classList.add('hidden');
    if (elements.btnStartAfterLoad) elements.btnStartAfterLoad.classList.remove('hidden');
}

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
    
    setUIPhase('QUESTION');
    playQuestion(q);
}

async function playQuestion(q) {
    if (currentState.isSilent) {
        setUIPhase('RECORDING');
        startRecording();
        return;
    }

    if (!currentState.isBlind) {
        if (elements.flashContainer) elements.flashContainer.classList.remove('hidden');
        if (elements.flashCharacter) elements.flashCharacter.textContent = '?';
    }

    if (currentState.useNaturalVoice) {
        const blob = await getAudioBlob(q.word, 'orig');
        if (blob) playBlob(blob);
        await sleep(1500);
    } else {
        for (let char of q.ruby) {
            const blob = await getAudioBlob(char, 'orig');
            if (blob) playBlob(blob);
            await sleep(RHYTHM_BEAT_MS);
        }
    }

    if (elements.flashContainer) elements.flashContainer.classList.add('hidden');
    setUIPhase('RECORDING');
    startRecording();
}

function setUIPhase(phase) {
    if (elements.voiceIndicator) elements.voiceIndicator.classList.add('hidden');
    if (elements.recordingContainer) elements.recordingContainer.classList.add('hidden');
    if (elements.feedbackPanel) elements.feedbackPanel.classList.add('hidden');
    
    switch(phase) {
        case 'QUESTION':
            if (elements.voiceIndicator) elements.voiceIndicator.classList.remove('hidden');
            break;
        case 'RECORDING':
            if (elements.recordingContainer) elements.recordingContainer.classList.remove('hidden');
            break;
        case 'FEEDBACK':
            if (elements.feedbackPanel) elements.feedbackPanel.classList.remove('hidden');
            break;
    }
}

// audio.js からのコールバックを受け取るために window に公開
window.handleRecognitionResult = function(text) {
    submitAnswer(text);
};

function submitAnswer(rawAnswer) {
    setUIPhase('FEEDBACK');
    const cleanedAnswer = normalizeText(rawAnswer);
    const normalizedCorrect = normalizeText(currentState.correctAnswer);
    const isCorrect = (cleanedAnswer === normalizedCorrect);

    if (isCorrect) {
        playSE('correct');
        currentState.score++;
        if (elements.feedbackBadge) {
            elements.feedbackBadge.textContent = '正解！';
            elements.feedbackBadge.className = 'feedback-badge hanko-stamp';
        }
    } else {
        playSE('wrong');
        if (elements.feedbackBadge) {
            elements.feedbackBadge.textContent = '✕';
            elements.feedbackBadge.className = 'feedback-badge wrong-stamp';
        }
    }
    
    if (elements.displayCorrectReverse) elements.displayCorrectReverse.textContent = katakanaToHiragana(currentState.correctAnswer);
    if (elements.displayUserAnswer) elements.displayUserAnswer.textContent = cleanedAnswer || '(無音)';
    if (elements.labelScore) elements.labelScore.textContent = `Score: ${currentState.score}`;
    if (elements.btnNext) elements.btnNext.textContent = currentState.currentQuestion >= QUESTIONS_PER_TURN ? '結果' : '次へ';
}

function nextQuestion() {
    if (currentState.currentQuestion >= QUESTIONS_PER_TURN) showResult(); 
    else startQuestion();
}

function showResult() {
    const accuracy = Math.round((currentState.score / QUESTIONS_PER_TURN) * 100);
    showScreen('result');
    if (elements.accuracyText) elements.accuracyText.textContent = `${accuracy}%`;
    if (elements.accuracyPath) elements.accuracyPath.style.strokeDasharray = `${accuracy}, 100`;
}

function initApp() {
    console.log('Initializing UI bindings...');
    if (elements.btnBeginner) elements.btnBeginner.onclick = () => startGame('beginner');
    if (elements.btnIntermediate) elements.btnIntermediate.onclick = () => startGame('intermediate');
    if (elements.btnAdvanced) elements.btnAdvanced.onclick = () => startGame('advanced');
    if (elements.btnNext) elements.btnNext.onclick = () => nextQuestion();
    if (elements.btnRestart) elements.btnRestart.onclick = () => showScreen('home');
    if (elements.btnStartAfterLoad) elements.btnStartAfterLoad.onclick = () => {
        showScreen('game');
        startQuestion();
    };
    if (elements.btnSkipQuestion) elements.btnSkipQuestion.onclick = () => {
        stopRecording();
        submitAnswer('(スキップ)');
    };
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
