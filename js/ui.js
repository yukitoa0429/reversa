/**
 * Reversa - UI要素管理および画面操作 (UI Management)
 */

export const elements = {
    // ホーム画面
    btnBeginner: document.getElementById('btn-beginner'),
    btnIntermediate: document.getElementById('btn-intermediate'),
    btnAdvanced: document.getElementById('btn-advanced'),
    checkSilent: document.getElementById('check-silent'),
    checkBlind: document.getElementById('check-blind'),
    checkNatural: document.getElementById('check-natural'),
    openDevBtn: document.getElementById('btn-open-dev'),

    // ゲーム進行・ステータス
    labelLevel: document.getElementById('label-level'),
    labelProgress: document.getElementById('label-progress'),
    labelScore: document.getElementById('label-score'),
    voiceIndicator: document.getElementById('voice-indicator'),
    recordingContainer: document.getElementById('recording-container'),
    recordingStatus: document.getElementById('recording-status'),
    gameWaveformCanvas: document.getElementById('game-waveform-canvas'),
    
    // フィードバック
    feedbackPanel: document.getElementById('feedback-panel'),
    feedbackBadge: document.getElementById('feedback-badge'),
    displayCorrectReverse: document.getElementById('display-correct-reverse'),
    displayUserAnswer: document.getElementById('display-user-answer'),
    userAnswerContainer: document.getElementById('user-answer-container'),
    btnNext: document.getElementById('btn-next'),
    btnSkipQuestion: document.getElementById('btn-skip-question'),

    // ローディング
    loadingBar: document.getElementById('loading-bar'),
    loadingStatus: document.getElementById('loading-status'),
    loadingTitle: document.getElementById('loading-title'),
    btnStartAfterLoad: document.getElementById('btn-start-after-load'),
    loadingSpinner: document.querySelector('.loading-spinner'),
    
    // リザルト
    accuracyPath: document.getElementById('accuracy-path'),
    accuracyText: document.getElementById('accuracy-text'),
    resultMessage: document.getElementById('result-message'),
    resultHistoryList: document.getElementById('result-history-list'),
    btnRestart: document.getElementById('btn-restart'),
    btnExportLog: document.getElementById('btn-export-log'),
    
    // 演出
    flashContainer: document.getElementById('flash-container'),
    flashCharacter: document.getElementById('flash-character'),
    
    // 開発者スタジオ
    devBackBtn: document.getElementById('btn-dev-back'),
    devStatus: document.getElementById('dev-status')
};

export function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`screen-${screenId}`);
    if (target) target.classList.add('active');
}
