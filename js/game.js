// Reversa - ゲームコアロジック
// 音声認識、ゲームループ、VAD（発話検知）の制御を担当します。

/**
 * 問題データベースから次の問題を取得します。
 * 直近に出題された問題と重複しないようにフィルタリングを行います。
 */
function getNextQuestion(theme) {
    const pool = QUESTION_DATABASE[theme] || [];
    if (pool.length > 0) {
        // 最近出題された5問に含まれないものを抽出
        let availablePool = pool.filter(q => !currentState.recentQuestions.includes(q.word));
        if (availablePool.length === 0) {
            // 全て出題済みの場合は履歴をリセット
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
    
    // UIの設定状態（無音、ブラインド、自然な音声モード）を取得
    currentState.isSilent = elements.checkSilent ? elements.checkSilent.checked : false;
    currentState.isBlind = elements.checkBlind ? elements.checkBlind.checked : true;
    currentState.useNaturalVoice = elements.checkNatural ? elements.checkNatural.checked : true;

    // 1ターンの全問題（通常5問）を事前に決定
    currentState.allSequences = [];
    for (let i = 0; i < QUESTIONS_PER_TURN; i++) {
        const q = getNextQuestion(theme);
        if (q) currentState.allSequences.push(q);
    }

    showScreen('loading');
    // 快適なプレイのため、音声データを一括で事前生成・キャッシュ
    await preloadAudios(currentState.allSequences);
}

/**
 * 決定された全問題の音声データを事前に取得・キャッシュします。
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
 * 各問題の開始処理を行います。
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
    
    // 難易度に応じたダイナミック背景の適用
    const dynamicBg = document.getElementById('dynamic-bg');
    if (dynamicBg && q.bg && q.bg !== 'default') {
        dynamicBg.style.backgroundImage = `url('assets/images/${q.bg}')`;
        dynamicBg.classList.add('active');
    } else if (dynamicBg) {
        dynamicBg.classList.remove('active');
    }
    
    setUIPhase('READING');
    elements.gameStatus.textContent = '準備中...';
    
    // 画面が切り替わってから少し待ってから読み上げ開始
    setTimeout(() => readSequence(q.ruby), 1200);
}

/**
 * 問題の読み上げシーケンスを制御します。
 * 設定に応じて「自然な読み上げ」または「リズム読み上げ」に分岐します。
 */
async function readSequence(rubyArray, fullWord) {
    if (currentState.isReading) return;
    if (!fullWord && rubyArray === currentState.originalSequence) fullWord = currentState.originalWord;
    currentState.isReading = true;

    elements.flashCharacter.textContent = '';
    elements.flashContainer.classList.remove('hidden');
    elements.gameStatus.textContent = currentState.isSilent ? '記憶してください...' : '準備中...';

    if (currentState.useNaturalVoice && !currentState.isSilent) {
        // OpenAI TTSによる自然な発音モード
        await readSequenceNatural(fullWord);
    } else {
        // 一音ずつリズムに合わせて発音するモード
        await readSequenceRhythm(rubyArray);
    }
    finishReading();
}

async function readSequenceNatural(word) {
    try {
        const blob = await getAudioBlob(word, 'orig');
        elements.gameStatus.textContent = '読み上げ中...';
        playSE('start');
        await sleep(500);
        elements.flashCharacter.textContent = currentState.isBlind ? '?' : word;
        elements.flashCharacter.classList.add('active');
        if (blob) {
            await playBlob(blob);
            await sleep(500);
        }
    } catch (err) {
        console.error("Natural reading error:", err);
        await readSequenceRhythm(currentState.originalSequence);
    }
}

/**
 * 一音ずつ一定の間隔（リズム）で読み上げます。
 */
async function readSequenceRhythm(rubyArray) {
    const sequence = Array.isArray(rubyArray) ? rubyArray : rubyArray.split('');
    const blobs = [];
    // 事前に全パーツの音声Blobを取得
    for (let unit of sequence) blobs.push(await getAudioBlob(unit, 'parts'));
    
    elements.gameStatus.textContent = '読み上げ中...';
    await sleep(800);
    playSE('start');
    
    for (let i = 0; i < sequence.length; i++) {
        if (!currentState.isReading) break;
        const unit = sequence[i];
        const blob = blobs[i];
        
        // 文字の表示（ブラインドモードなら「?」を表示）
        elements.flashCharacter.textContent = currentState.isBlind ? '?' : unit;
        
        // CSSアニメーションのリセットと発火
        elements.flashCharacter.classList.remove('active');
        void elements.flashCharacter.offsetWidth; // リフロー発生
        elements.flashCharacter.classList.add('active');
        
        // 音声再生（無音モードでなければ）
        if (!currentState.isSilent && blob) playBlob(blob);
        
        // 設定されたリズム（BPM）に合わせて待機
        await sleep(RHYTHM_BEAT_MS); 
    }
}

function finishReading() {
    currentState.isReading = false;
    elements.flashContainer.classList.add('hidden');
    elements.gameStatus.textContent = 'あなたの声を聞いています...';
    startRecording();
}

/**
 * ユーザーの音声を録音します。
 */
async function startRecording() {
    if (currentState.isRecording) return;
    if (currentState.countdownInterval) clearInterval(currentState.countdownInterval);
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        currentState.mediaRecorder = new MediaRecorder(stream);
        currentState.audioChunks = [];
        
        currentState.mediaRecorder.ondataavailable = (e) => currentState.audioChunks.push(e.data);
        currentState.mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(currentState.audioChunks, { type: 'audio/webm' });
            
            if (currentState.cancelProcess) {
                // 録音がスキップまたはエラーで中止された場合の処理
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
                // Whisper APIによる文字起こし処理へ
                processAudio(audioBlob);
            }
            
            // ストリームの停止とVADリソースの解放
            stream.getTracks().forEach(track => track.stop());
            if (currentState.vadInterval) cancelAnimationFrame(currentState.vadInterval);
            if (currentState.vadContext) currentState.vadContext.close();
            elements.voiceIndicator.classList.remove('active');
        };

        currentState.mediaRecorder.start();
        currentState.isRecording = true;
        setUIPhase('RECORDING');
        elements.gameStatus.textContent = "";
        
        // VAD（発話区間検出）を開始
        setupVAD(stream);
        
        // 最大録音時間での強制終了タイマー（安全策）
        currentState.recordingTimer = setTimeout(() => { if (currentState.isRecording) stopRecording(); }, MAX_RECORDING_TIME);
    } catch (err) {
        console.error('Microphone access denied:', err);
        setUIPhase('RETRY');
    }
}

/**
 * VAD（Voice Activity Detection：発話区間検出）をセットアップします。
 * 無音状態が一定時間続くと自動で録音を停止します。
 */
function setupVAD(stream) {
    const audioCtx = getPlaybackContext();
    currentState.vadAnalyser = audioCtx.createAnalyser();
    currentState.vadAnalyser.fftSize = 2048;
    currentState.vadSource = audioCtx.createMediaStreamSource(stream);
    currentState.vadSource.connect(currentState.vadAnalyser);
    currentState.vadDataArray = new Uint8Array(currentState.vadAnalyser.frequencyBinCount);
    currentState.vadTimeDataArray = new Uint8Array(currentState.vadAnalyser.fftSize);
    
    // 波形表示用のキャンバスサイズ設定
    setTimeout(() => {
        elements.gameWaveformCanvas.width = elements.gameWaveformCanvas.offsetWidth || 280;
        elements.gameWaveformCanvas.height = elements.gameWaveformCanvas.offsetHeight || 80;
    }, 50);

    let isSpeaking = false;
    let silenceStart = Date.now();
    // 難易度（文字数）に応じて無音判定の閾値を動的に変更
    let silenceThreshold = (currentState.currentLevel === 'intermediate') ? 2500 : (currentState.currentLevel === 'advanced') ? 3500 : 1500;
    
    function detectSilence() {
        if (!currentState.isRecording) return;
        
        // リアルタイム波形描画
        drawGameWaveform();
        
        currentState.vadAnalyser.getByteFrequencyData(currentState.vadDataArray);
        let average = currentState.vadDataArray.reduce((a,b)=>a+b, 0) / currentState.vadDataArray.length;
        let silenceDuration = Date.now() - silenceStart;
        
        if (average > 10) {
            // 発話中
            isSpeaking = true;
            silenceStart = Date.now();
            elements.voiceIndicator.classList.add('active');
            elements.recordingCountdown.textContent = "録音中...";
        } else {
            // 無音状態
            elements.voiceIndicator.classList.remove('active');
            if (isSpeaking) {
                // 話し始めた後の無音判定（自動停止までのカウントダウン）
                let timeLeft = Math.max(0, Math.ceil((silenceThreshold - silenceDuration) / 1000));
                elements.recordingCountdown.textContent = timeLeft;
                if (silenceDuration > silenceThreshold) { stopRecording(); return; }
            } else if (silenceDuration > 5000) {
                // 5秒間全く声が検知されなければスキップとみなす
                stopRecording(true);
                return;
            }
        }
        currentState.vadInterval = requestAnimationFrame(detectSilence);
    }
    detectSilence();
}

function drawGameWaveform() {
    const canvas = elements.gameWaveformCanvas;
    if (!canvas || !currentState.vadAnalyser) return;
    const ctx = canvas.getContext('2d');
    const dataArray = currentState.vadTimeDataArray;
    currentState.vadAnalyser.getByteTimeDomainData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    const sliceWidth = canvas.width / dataArray.length;
    let x = 0;
    for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        x += sliceWidth;
    }
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
}

function stopRecording(cancelProcess = false) {
    if (currentState.mediaRecorder && currentState.isRecording) {
        currentState.cancelProcess = cancelProcess;
        currentState.mediaRecorder.stop();
        currentState.isRecording = false;
        if (currentState.recordingTimer) clearTimeout(currentState.recordingTimer);
        elements.recordingCountdown.textContent = '0';
        elements.micArea.classList.add('hidden');
        elements.recordingContainer.classList.remove('active');
    }
}

/**
 * 録音された音声を OpenAI Whisper API で文字起こしし、結果を判定します。
 */
async function processAudio(audioBlob) {
    currentState.currentAudioBlob = audioBlob; 
    
    // 即座に再生できるよう、事前にデコードを試みる
    audioBlob.arrayBuffer().then(ab => getPlaybackContext().decodeAudioData(ab))
        .then(buffer => currentState.preparedAudioBuffer = trimAudioBuffer(buffer))
        .catch(err => console.warn("Pre-decoding failed:", err));

    elements.recordingStatus.textContent = '';
    elements.recordingStatus.classList.add('listening');
    
    try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'answer.wav');
        formData.append('model', 'whisper-1');
        formData.append('language', 'ja');
        
        // Whisperの精度を上げるためのヒント（プロンプト）を付与
        formData.append('prompt', `逆暗唱, ${currentState.correctAnswer}, ${currentState.originalWord}`);
        
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}` },
            body: formData
        });

        if (!response.ok) throw new Error('Whisper API Error');
        const data = await response.json();
        const transcription = data.text.trim();
        
        // モーラ数（音拍）の計算
        const correctMoraCount = getMoraCount(currentState.correctAnswer);
        const answerMoraCount = getMoraCount(transcription);
        
        // ハルシネーション（APIが勝手に出力する不要な文言）や、明らかに文字数が違う場合の検知
        const isHallucination = ['視聴', 'チャンネル', '登録'].some(w => transcription.includes(w)) || answerMoraCount > 20;
        
        if (answerMoraCount < 1 || isHallucination || Math.abs(correctMoraCount - answerMoraCount) >= 2) {
            // 聞き取り失敗としてリトライを促す
            elements.recordingStatus.textContent = 'うまく聞き取れませんでした。もう一度お願いします！';
            elements.recordingStatus.classList.add('shake-text');
            setTimeout(() => {
                elements.recordingStatus.classList.remove('shake-text');
                setUIPhase('READING');
                currentState.isReading = false;
                readSequence(currentState.originalSequence);
            }, 2000);
            return;
        }
        // 正解判定へ
        submitAnswer(transcription);
    } catch (err) {
        console.error('Processing error:', err);
        elements.recordingStatus.textContent = '通信エラーが発生しました。もう一度試します。';
        setTimeout(() => startRecording(), 2000);
    }
}

/**
 * 回答を提出し、正解判定とフィードバックを表示します。
 */
function submitAnswer(rawAnswer) {
    setUIPhase('FEEDBACK');
    // 自分の録音した声を再生（フィードバック用）
    if (currentState.preparedAudioBuffer) playBuffer(currentState.preparedAudioBuffer);
    else if (currentState.currentAudioBlob) playBlob(currentState.currentAudioBlob);
    
    // 回答と正解を正規化（ひらがな化・記号除去等）して比較
    const cleanedAnswer = normalizeText(rawAnswer);
    const normalizedCorrect = normalizeText(currentState.correctAnswer);
    const isCorrect = (cleanedAnswer === normalizedCorrect) && (cleanedAnswer.length === normalizedCorrect.length);

    if (isCorrect) {
        // 正解時の演出
        playSE('correct');
        currentState.score++;
        setTimeout(() => {
            elements.feedbackBadge.textContent = 'お見事';
            elements.feedbackBadge.className = 'feedback-badge hanko-stamp animate';
        }, 150);
        elements.userAnswerContainer.classList.add('hidden');
    } else {
        // 不正解時の演出
        playSE('wrong');
        setTimeout(() => {
            elements.feedbackBadge.textContent = '✕';
            elements.feedbackBadge.className = 'feedback-badge wrong-stamp animate';
        }, 150);
        elements.userAnswerContainer.classList.remove('hidden');
        elements.displayUserAnswer.textContent = cleanedAnswer || '(無音・認識不能)';
    }
    
    // 答えの表示（カタカナをひらがなに変換して読みやすく）
    setTimeout(() => elements.displayCorrectReverse.textContent = katakanaToHiragana(currentState.correctAnswer), 150);
    
    saveLog({ 
        level: currentState.currentLevel, 
        original: katakanaToHiragana(currentState.originalWord), 
        correct: katakanaToHiragana(currentState.correctAnswer), 
        user_answer: katakanaToHiragana(cleanedAnswer||''), 
        is_correct: isCorrect 
    });

    let audioUrl = currentState.currentAudioBlob ? URL.createObjectURL(currentState.currentAudioBlob) : null;
    currentState.turnLogs.push({
        original: katakanaToHiragana(currentState.originalWord),
        user_answer: katakanaToHiragana(cleanedAnswer || '(無音/スキップ)'),
        is_correct: isCorrect,
        audioUrl: audioUrl
    });
    
    elements.labelScore.textContent = `Score: ${currentState.score}`;
    elements.btnNext.textContent = currentState.currentQuestion >= QUESTIONS_PER_TURN ? '結果を見る' : '次へ';
    
    if (currentState.autoAdvanceTimer) clearTimeout(currentState.autoAdvanceTimer);
    currentState.autoAdvanceTimer = setTimeout(() => nextQuestion(), 3900);
}

    if (currentState.autoAdvanceTimer) clearTimeout(currentState.autoAdvanceTimer);
    if (currentState.currentQuestion >= QUESTIONS_PER_TURN) showResult(); else startQuestion();
}

/**
 * アプリの初期化処理
 * ページ読み込み時にボタンのクリックイベントなどを紐付けます。
 */
function initApp() {
    // 難易度選択ボタンの紐付け
    if (elements.btnLevelBeginner) elements.btnLevelBeginner.onclick = () => startGame('beginner');
    if (elements.btnLevelIntermediate) elements.btnLevelIntermediate.onclick = () => startGame('intermediate');
    if (elements.btnLevelAdvanced) elements.btnLevelAdvanced.onclick = () => startGame('advanced');

    // ゲーム中の操作ボタンの紐付け
    if (elements.btnStartAfterLoad) {
        elements.btnStartAfterLoad.onclick = () => {
            showScreen('game');
            startQuestion();
        };
    }
    if (elements.btnNext) elements.btnNext.onclick = () => nextQuestion();
    if (elements.btnRestart) elements.btnRestart.onclick = () => showScreen('home');
    if (elements.btnExportLog) elements.btnExportLog.onclick = () => exportLogs();
    if (elements.btnRetryRecord) elements.btnRetryRecord.onclick = () => startRecording();
    if (elements.btnSkipQuestion) elements.btnSkipQuestion.onclick = () => skipQuestion();
    if (elements.btnPlayMaster) elements.btnPlayMaster.onclick = () => playMasterAudio();
    if (elements.btnStartRecord) elements.btnStartRecord.onclick = () => startRecording();

    // 開発者メニューの紐付け
    if (elements.openDevBtn) elements.openDevBtn.onclick = () => {
        showScreen('dev');
        if (typeof initDevStudio === 'function') initDevStudio();
    };
    if (elements.devBackBtn) elements.devBackBtn.onclick = () => showScreen('home');

    // 初期画面を表示
    showScreen('home');
}

// 開発者スタジオの動的インポート（必要な場合のみ）
import { initDevStudio } from './dev.js';
import { startRecording, stopRecording, playSE, playBlob, getAudioBuffer, playBuffer, getAudioBlob } from './audio.js';
import { QUESTION_DATABASE } from '../questions.js';

// DOMの読み込み完了を待ってから初期化を実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

function showResult() {
    const accuracy = Math.round((currentState.score / QUESTIONS_PER_TURN) * 100);
    showScreen('result');
    elements.accuracyText.textContent = `${accuracy}%`;
    elements.accuracyPath.style.strokeDasharray = `${accuracy}, 100`;
    let msg = accuracy === 100 ? '全問正解！🎉' : accuracy >= 80 ? '素晴らしい！✨' : accuracy >= 50 ? 'ナイス！' : '継続は力なり💤';
    elements.resultMessage.textContent = msg;

    const listEl = document.getElementById('result-history-list');
    if (listEl) {
        listEl.innerHTML = '';
        currentState.turnLogs.forEach((log, index) => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div class="history-item-left">
                    <span class="history-index">${index + 1}.</span>
                    <span class="history-icon ${log.is_correct ? 'correct' : 'wrong'}">${log.is_correct ? '◯' : '✕'}</span>
                    <div class="history-text">
                        <span class="history-word" style="white-space: nowrap;">${log.original}</span>
                        <span class="history-answer" style="white-space: nowrap;">${log.user_answer}</span>
                    </div>
                </div>
            `;
            if (log.audioUrl) {
                const btn = document.createElement('button');
                btn.className = 'btn-history-play';
                btn.innerHTML = '▶';
                btn.onclick = () => new Audio(log.audioUrl).play();
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

async function playMasterAudio() {
    const q = currentState.allSequences[currentState.currentQuestion - 1];
    if (!q) return;
    const sequence = Array.isArray(q.reverse) ? q.reverse : q.reverse.split('');
    const blobs = [];
    for (let unit of sequence) blobs.push(await getAudioBlob(unit, 'parts'));
    for (let i = 0; i < sequence.length; i++) {
        if (blobs[i]) playBlob(blobs[i]);
        await sleep(RHYTHM_BEAT_MS - 20);
    }
}
