// Reversa - ゲームコアロジック
// 音声認識、ゲームループ、VAD（発話検知）の制御を担当します。

// 1セットの問題数
var QUESTIONS_PER_TURN = 10;
var RHYTHM_BEAT_MS = 500;

/**
 * 問題データベースから次の問題を取得します。
 */
function getNextQuestion(theme) {
    var db = window.QUESTION_DATABASE || {};
    var pool = db[theme] || [];
    if (pool.length > 0) {
        var availablePool = pool.filter(function(q) {
            return !currentState.recentQuestions.includes(q.word);
        });
        if (availablePool.length === 0) {
            availablePool = pool;
            currentState.recentQuestions = [];
        }
        var randomIndex = Math.floor(Math.random() * availablePool.length);
        var selectedQuestion = availablePool[randomIndex];
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
    console.log("Starting game: " + theme);
    currentState.currentLevel = theme;
    currentState.currentQuestion = 0;
    currentState.score = 0;
    currentState.turnLogs = [];
    
    // UIの設定を取得
    currentState.isSilent = elements.checkSilent ? elements.checkSilent.checked : false;
    currentState.isBlind = elements.checkBlind ? elements.checkBlind.checked : true;
    currentState.useNaturalVoice = elements.checkNatural ? elements.checkNatural.checked : true;

    // 問題リストを作成
    currentState.allSequences = [];
    for (var i = 0; i < QUESTIONS_PER_TURN; i++) {
        var q = getNextQuestion(theme);
        if (q) currentState.allSequences.push(q);
    }

    showScreen('loading');
    await preloadAudios(currentState.allSequences);
}

/**
 * 音声データの事前生成・キャッシュ
 */
async function preloadAudios(questions) {
    var total = questions.length;
    if (elements.loadingSpinner) elements.loadingSpinner.classList.remove('hidden');
    if (elements.btnStartAfterLoad) elements.btnStartAfterLoad.classList.add('hidden');
    
    for (var i = 0; i < total; i++) {
        var q = questions[i];
        if (elements.loadingStatus) elements.loadingStatus.textContent = (i + 1) + " / " + total + " 準備中...";
        await getAudioBlob(q.word, 'orig');
        await getAudioBlob(q.reverse, 'rev');
        var progress = ((i + 1) / total) * 100;
        if (elements.loadingBar) elements.loadingBar.style.width = progress + "%";
    }
    if (elements.loadingBar) elements.loadingBar.style.width = '100%';
    if (elements.loadingStatus) elements.loadingStatus.textContent = '準備完了';
    if (elements.loadingTitle) elements.loadingTitle.textContent = '準備が整いました！';
    if (elements.loadingSpinner) elements.loadingSpinner.classList.add('hidden');
    if (elements.btnStartAfterLoad) elements.btnStartAfterLoad.classList.remove('hidden');
}

/**
 * 各問題の開始処理
 */
function startQuestion() {
    currentState.currentQuestion++;
    if (elements.labelProgress) elements.labelProgress.textContent = currentState.currentQuestion + " / " + QUESTIONS_PER_TURN;
    
    var q = currentState.allSequences[currentState.currentQuestion - 1];
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
 * 問題の読み上げ実行
 */
async function playQuestion(q) {
    if (elements.voiceIndicator) elements.voiceIndicator.classList.remove('hidden');

    if (!currentState.isBlind && elements.flashContainer) {
        elements.flashContainer.classList.remove('hidden');
        elements.flashCharacter.textContent = '?';
    }

    var blob = await getAudioBlob(q.word, 'orig');
    if (blob) await playBlob(blob);
    await sleep(1500);

    if (elements.flashContainer) elements.flashContainer.classList.add('hidden');
    if (elements.voiceIndicator) elements.voiceIndicator.classList.add('hidden');
    
    if (elements.recordingContainer) elements.recordingContainer.classList.remove('hidden');
    startRecording();
}

/**
 * 回答提出
 */
function submitAnswer(rawAnswer) {
    if (elements.recordingContainer) elements.recordingContainer.classList.add('hidden');
    if (elements.feedbackPanel) elements.feedbackPanel.classList.remove('hidden');

    var cleanedAnswer = normalizeText(rawAnswer);
    var normalizedCorrect = normalizeText(currentState.correctAnswer);
    var isCorrect = (cleanedAnswer === normalizedCorrect);

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
    if (elements.displayUserAnswer) elements.displayUserAnswer.textContent = cleanedAnswer || '(無音)';
    if (elements.labelScore) elements.labelScore.textContent = "Score: " + currentState.score;
    if (elements.btnNext) elements.btnNext.textContent = currentState.currentQuestion >= QUESTIONS_PER_TURN ? '結果を見る' : '次へ';
}

function nextQuestion() {
    if (elements.feedbackPanel) elements.feedbackPanel.classList.add('hidden');
    if (currentState.currentQuestion >= QUESTIONS_PER_TURN) showResult(); 
    else startQuestion();
}

function skipQuestion() {
    stopRecording();
    submitAnswer('(スキップ)');
}

/**
 * 結果表示
 */
function showResult() {
    var accuracy = Math.round((currentState.score / QUESTIONS_PER_TURN) * 100);
    showScreen('result');
    if (elements.accuracyText) elements.accuracyText.textContent = accuracy + "%";
    if (elements.accuracyPath) elements.accuracyPath.style.strokeDasharray = accuracy + ", 100";
    if (elements.resultMessage) elements.resultMessage.textContent = accuracy === 100 ? '全問正解！🎉' : 'お疲れ様でした！';
}
