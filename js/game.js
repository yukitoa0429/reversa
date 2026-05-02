// Reversa - ゲームコアロジック
// 音声認識、ゲームループ、VAD（発話検知）の制御を担当します。

import { currentState } from './state.js';
import { elements, showScreen } from './ui.js';
import { 
    startRecording, 
    stopRecording, 
    playSE, 
    playBlob, 
    getAudioBuffer, 
    playBuffer, 
    getAudioBlob 
} from './audio.js';
import { normalizeText, katakanaToHiragana, sleep } from './utils.js';
import { initDevStudio } from './dev.js';

// グローバル変数から問題データを取得 (questions.js が先に読み込まれている前提)
const DB = window.QUESTION_DATABASE || {};
const QUESTIONS_PER_TURN = 10;
const RHYTHM_BEAT_MS = 500;

/**
 * 問題データベースから次の問題を取得します。
 */
function getNextQuestion(theme) {
    const pool = DB[theme] || [];
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
 * ゲームを開始し、初期状態をセットアップします。
 */
async function startGame(theme) {
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

/**
 * 音声データの事前生成・キャッシュ
 */
async function preloadAudios(questions) {
    const total = questions.length;
    elements.loadingSpinner.classList.remove('hidden');
    elements.btnStartAfterLoad.classList.add('hidden');
    
    for (let i = 0; i < total; i++) {
        const q = questions[i];
        elements.loadingStatus.textContent = `${i + 1} / ${total} 準備中...`;
        for (let char of q.ruby) await getAudioBlob(char, 'orig');
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

/**
 * 各問題の開始処理
 */
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
    
    const dynamicBg = document.getElementById('dynamic-bg');
    if (dynamicBg && q.bg && q.bg !== 'default') {
        dynamicBg.style.backgroundImage = `url('assets/images/${q.bg}')`;
        dynamicBg.classList.add('active');
    } else if (dynamicBg) {
        dynamicBg.classList.remove('active');
    }

    setUIPhase('QUESTION');
    playQuestion(q);
}

/**
 * 問題の読み上げ実行
 */
async function playQuestion(q) {
    if (currentState.isSilent) {
        setUIPhase('RECORDING');
        startRecording();
        return;
    }

    // ブラインドモードでない場合は文字を表示
    if (!currentState.isBlind) {
        elements.flashContainer.classList.remove('hidden');
        elements.flashCharacter.textContent = '?';
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

    elements.flashContainer.classList.add('hidden');
    setUIPhase('RECORDING');
    startRecording();
}

/**
 * UIのフェーズ（出題中、録音中、結果表示中など）を切り替え
 */
function setUIPhase(phase) {
    elements.voiceIndicator.classList.add('hidden');
    elements.recordingContainer.classList.add('hidden');
    elements.feedbackPanel.classList.add('hidden');
    
    switch(phase) {
        case 'QUESTION':
            elements.voiceIndicator.classList.remove('hidden');
            break;
        case 'RECORDING':
            elements.recordingContainer.classList.remove('hidden');
            break;
        case 'FEEDBACK':
            elements.feedbackPanel.classList.remove('hidden');
            break;
    }
}

/**
 * 音声認識の結果を処理 (audio.js から呼ばれる)
 */
window.handleRecognitionResult = function(text) {
    submitAnswer(text);
};

/**
 * 回答を提出し、判定を表示
 */
function submitAnswer(rawAnswer) {
    setUIPhase('FEEDBACK');
    if (currentState.currentAudioBlob) playBlob(currentState.currentAudioBlob);
    
    const cleanedAnswer = normalizeText(rawAnswer);
    const normalizedCorrect = normalizeText(currentState.correctAnswer);
    const isCorrect = (cleanedAnswer === normalizedCorrect);

    if (isCorrect) {
        playSE('correct');
        currentState.score++;
        elements.feedbackBadge.textContent = 'お見事';
        elements.feedbackBadge.className = 'feedback-badge hanko-stamp animate';
        elements.userAnswerContainer.classList.add('hidden');
    } else {
        playSE('wrong');
        elements.feedbackBadge.textContent = '✕';
        elements.feedbackBadge.className = 'feedback-badge wrong-stamp animate';
        elements.userAnswerContainer.classList.remove('hidden');
        elements.displayUserAnswer.textContent = cleanedAnswer || '(無音)';
    }
    
    elements.displayCorrectReverse.textContent = katakanaToHiragana(currentState.correctAnswer);
    elements.labelScore.textContent = `Score: ${currentState.score}`;
    elements.btnNext.textContent = currentState.currentQuestion >= QUESTIONS_PER_TURN ? '結果を見る' : '次へ';
    
    if (currentState.autoAdvanceTimer) clearTimeout(currentState.autoAdvanceTimer);
    currentState.autoAdvanceTimer = setTimeout(() => nextQuestion(), 4000);
}

function nextQuestion() {
    if (currentState.autoAdvanceTimer) clearTimeout(currentState.autoAdvanceTimer);
    if (currentState.currentQuestion >= QUESTIONS_PER_TURN) showResult(); 
    else startQuestion();
}

/**
 * 結果表示
 */
function showResult() {
    const accuracy = Math.round((currentState.score / QUESTIONS_PER_TURN) * 100);
    showScreen('result');
    elements.accuracyText.textContent = `${accuracy}%`;
    elements.accuracyPath.style.strokeDasharray = `${accuracy}, 100`;
    elements.resultMessage.textContent = accuracy === 100 ? '全問正解！🎉' : 'お疲れ様でした！';

    if (elements.resultHistoryList) {
        elements.resultHistoryList.innerHTML = '';
        currentState.turnLogs.forEach((log, index) => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `<span>${index + 1}. ${log.original} -> ${log.user_answer}</span>`;
            elements.resultHistoryList.appendChild(item);
        });
    }
}

/**
 * アプリの初期化
 */
function initApp() {
    console.log('Reversa Initializing...');
    if (elements.btnLevelBeginner) elements.btnLevelBeginner.onclick = () => startGame('beginner');
    if (elements.btnLevelIntermediate) elements.btnLevelIntermediate.onclick = () => startGame('intermediate');
    if (elements.btnLevelAdvanced) elements.btnLevelAdvanced.onclick = () => startGame('advanced');

    if (elements.btnStartAfterLoad) {
        elements.btnStartAfterLoad.onclick = () => {
            showScreen('game');
            startQuestion();
        };
    }
    if (elements.btnNext) elements.btnNext.onclick = () => nextQuestion();
    if (elements.btnRestart) elements.btnRestart.onclick = () => showScreen('home');
    if (elements.btnRetryRecord) elements.btnRetryRecord.onclick = () => startRecording();
    if (elements.btnSkipQuestion) elements.btnSkipQuestion.onclick = () => {
        if (currentState.isRecording) stopRecording();
        submitAnswer('(スキップ)');
    };
    if (elements.btnPlayMaster) elements.btnPlayMaster.onclick = () => playMasterAudio();
    if (elements.openDevBtn) elements.openDevBtn.onclick = () => {
        showScreen('dev');
        initDevStudio();
    };
    if (elements.devBackBtn) elements.devBackBtn.onclick = () => showScreen('home');

    showScreen('home');
}

// 起動
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
