// Reversa - Main Entry Point

async function init() {
    console.log("Reversa Initializing...");
    
    try {
        await initDB();
    } catch (e) {
        console.warn("IndexedDB initialization failed.", e);
    }

    if (elements.btnNext) elements.btnNext.onclick = nextQuestion;
    if (elements.btnRestart) elements.btnRestart.onclick = () => showScreen('home');
    if (elements.btnExportLog) elements.btnExportLog.onclick = exportLogs;
    if (elements.btnSkipQuestion) elements.btnSkipQuestion.onclick = skipQuestion;
    if (elements.btnPlayMaster) elements.btnPlayMaster.onclick = playMasterAudio;
    
    if (elements.btnRetryRecord) {
        elements.btnRetryRecord.onclick = () => {
            if (elements.recordingContainer) elements.recordingContainer.classList.add('hidden');
            if (elements.voiceIndicator) elements.voiceIndicator.classList.remove('hidden');
            elements.gameStatus.textContent = '読み上げ直しています...';
            currentState.isReading = false;
            readSequence(currentState.originalSequence, currentState.originalWord);
        };
    }
    
    if (elements.btnStartAfterLoad) {
        elements.btnStartAfterLoad.onclick = () => {
            showScreen('game');
            startQuestion();
        };
    }

    if (elements.checkSilent) {
        elements.checkSilent.onchange = (e) => currentState.isSilent = e.target.checked;
    }
    if (elements.checkBlind) {
        elements.checkBlind.onchange = (e) => currentState.isBlind = e.target.checked;
    }

    elements.openDevBtn.onclick = () => showScreen('dev');
    elements.devBackBtn.onclick = () => showScreen('home');
    
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.onclick = () => switchDevTab(btn.dataset.tab);
    });

    elements.btnRecordDev.onclick = toggleDevRecording;
    elements.btnRecordRhythm.onclick = startRhythmRecording;
    elements.btnPlayDev.onclick = playCurrentDevRecording;
    elements.btnSaveDev.onclick = saveCurrentDevRecording;
    
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

    showScreen('home');
    initDevMode();

    if (typeof CONFIG === 'undefined' || !CONFIG.OPENAI_API_KEY || CONFIG.OPENAI_API_KEY === "PASTE_YOUR_KEY_HERE") {
        setTimeout(() => alert('OpenAI APIキーが設定されていません。config.js を編集してください。'), 500);
    }
}

// Start the app
init();
