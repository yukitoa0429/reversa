/**
 * Reversa - UI要素管理および画面操作 (UI Management)
 */

var elements = {
    // 画面取得
    screenHome: document.getElementById('screen-home'),
    screenLoading: document.getElementById('screen-loading'),
    screenGame: document.getElementById('screen-game'),
    screenResult: document.getElementById('screen-result'),
    screenDev: document.getElementById('screen-dev'),

    // ホーム画面設定
    checkSilent: document.getElementById('check-silent'),
    checkBlind: document.getElementById('check-blind'),
    checkNatural: document.getElementById('check-natural'),

    // ゲーム進行
    labelLevel: document.getElementById('label-level'),
    labelProgress: document.getElementById('label-progress'),
    labelScore: document.getElementById('label-score'),
    voiceIndicator: document.getElementById('voice-indicator'),
    recordingContainer: document.getElementById('recording-container'),
    feedbackPanel: document.getElementById('feedback-panel'),
    feedbackBadge: document.getElementById('feedback-badge'),
    displayCorrectReverse: document.getElementById('display-correct-reverse'),
    displayUserAnswer: document.getElementById('display-user-answer'),
    userAnswerContainer: document.getElementById('user-answer-container'),
    btnNext: document.getElementById('btn-next'),

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
    
    // 演出
    flashContainer: document.getElementById('flash-container'),
    flashCharacter: document.getElementById('flash-character')
};

/**
 * 画面を切り替えます。
 */
function showScreen(screenId) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) {
        screens[i].classList.remove('active');
    }
    var target = document.getElementById('screen-' + screenId);
    if (target) target.classList.add('active');
}
