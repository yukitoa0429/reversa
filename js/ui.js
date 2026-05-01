// Reversa - UI Management

const elements = {
    levelOptions: document.getElementById('theme-options'),
    labelLevel: document.getElementById('label-level'),
    labelProgress: document.getElementById('label-progress'),
    labelScore: document.getElementById('label-score'),
    gameStatus: document.getElementById('game-status'),
    voiceIndicator: document.getElementById('voice-indicator'),
    recordingContainer: document.getElementById('recording-container'),
    recordingStatus: document.getElementById('recording-status'),
    feedbackPanel: document.getElementById('feedback-panel'),
    feedbackBadge: document.getElementById('feedback-badge'),
    displayCorrectReverse: document.getElementById('display-correct-reverse'),
    displayUserAnswer: document.getElementById('display-user-answer'),
    userAnswerContainer: document.getElementById('user-answer-container'),
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
    countdownArea: document.getElementById('recording-timer-text'),
    recordingCountdown: document.getElementById('recording-countdown'),
    btnPlayMaster: document.getElementById('btn-play-master'),
    btnStartRecord: document.getElementById('btn-start-record'),
    checkSilent: document.getElementById('check-silent'),
    gameWaveformCanvas: document.getElementById('game-waveform-canvas'),
    checkBlind: document.getElementById('check-blind'),
    checkNatural: document.getElementById('check-natural'),
    flashContainer: document.getElementById('flash-container'),
    flashCharacter: document.getElementById('flash-character'),
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

function showScreen(screenId) {
    Object.keys(elements.screens).forEach(key => {
        elements.screens[key].classList.toggle('active', key === screenId);
    });
    currentState.screen = screenId;
    
    if (screenId === 'home') {
        const dynamicBg = document.getElementById('dynamic-bg');
        if (dynamicBg) dynamicBg.classList.remove('active');
    }
}

function setUIPhase(phase) {
    if (currentState.recordingTimer) clearTimeout(currentState.recordingTimer);
    if (currentState.countdownInterval) clearInterval(currentState.countdownInterval);
    
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
    }
}
