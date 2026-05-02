/**
 * Reversa - UI要素管理および画面操作 (UI Management)
 * 
 * 【目的】
 * HTML上のすべてのパーツ（ボタン、テキスト、キャンバス等）をJavaScriptから操作するための
 * 参照を一括管理し、画面の切り替えや視覚的なフィードバックを制御します。
 * 
 * 【主な機能】
 * 1. 要素のキャッシュ: document.getElementById 等の呼び出しを最小限にし、パフォーマンスを向上。
 * 2. 画面遷移制御: ホーム、ロード中、ゲーム、結果、開発者スタジオの表示・非表示を切り替え。
 * 3. 動的演出: ローディングバーの進捗、正答率の円形グラフ、結果メッセージの更新。
 * 4. 視覚エフェクト: フィードバック（正解/不正解）の表示、波形キャンバスのクリアなど。
 */

// HTML要素への参照をまとめたオブジェクト
export const elements = {
    // 難易度・設定関連
    levelOptions: document.getElementById('theme-options'),
    labelLevel: document.getElementById('label-level'),
    labelProgress: document.getElementById('label-progress'),
    labelScore: document.getElementById('label-score'),
    
    // ゲーム進行・ステータス
    gameStatus: document.getElementById('game-status'),
    voiceIndicator: document.getElementById('voice-indicator'),
    recordingContainer: document.getElementById('recording-container'),
    recordingStatus: document.getElementById('recording-status'),
    
    // フィードバック・判定表示
    feedbackPanel: document.getElementById('feedback-panel'),
    feedbackBadge: document.getElementById('feedback-badge'),
    displayCorrectReverse: document.getElementById('display-correct-reverse'),
    displayUserAnswer: document.getElementById('display-user-answer'),
    userAnswerContainer: document.getElementById('user-answer-container'),
    
    // ボタン類
    btnNext: document.getElementById('btn-next'),
    btnRestart: document.getElementById('btn-restart'),
    btnExportLog: document.getElementById('btn-export-log'),
    btnRetryRecord: document.getElementById('btn-retry-record'),
    btnSkipQuestion: document.getElementById('btn-skip-question'),
    btnPlayMaster: document.getElementById('btn-play-master'),
    btnStartRecord: document.getElementById('btn-start-record'),
    
    // リザルト画面（円形グラフなど）
    accuracyPath: document.getElementById('accuracy-path'),
    accuracyText: document.getElementById('accuracy-text'),
    resultMessage: document.getElementById('result-message'),
    resultHistoryList: document.getElementById('result-history-list'),
    
    // ローディング画面
    loadingBar: document.getElementById('loading-bar'),
    loadingStatus: document.getElementById('loading-status'),
    loadingTitle: document.getElementById('loading-title'),
    btnStartAfterLoad: document.getElementById('btn-start-after-load'),
    loadingSpinner: document.querySelector('.loading-spinner'),
    
    // 設定チェックボックス
    checkSilent: document.getElementById('check-silent'),
    checkBlind: document.getElementById('check-blind'),
    checkNatural: document.getElementById('check-natural'),
    
    // キャンバス・演出
    gameWaveformCanvas: document.getElementById('game-waveform-canvas'),
    flashContainer: document.getElementById('flash-container'),
    flashCharacter: document.getElementById('flash-character'),
    
    // 開発者スタジオ関連
    openDevBtn: document.getElementById('btn-open-dev'),
    devBackBtn: document.getElementById('btn-dev-back'),
    devNavItems: document.querySelectorAll('.nav-item'),
    devListContainer: document.getElementById('dev-list-container'),
    devTargetText: document.getElementById('dev-target-text'),
    btnRecordDev: document.getElementById('btn-record-dev'),
    btnPlayDev: document.getElementById('btn-play-dev'),
    btnSaveDev: document.getElementById('btn-save-dev'),
    devStatus: document.getElementById('dev-status'),
    waveformCanvas: document.getElementById('waveform-canvas')
};

/**
 * 指定した画面を表示し、他の画面を非表示にする
 * @param {string} screenId 表示したい画面のID (home, loading, game, result, dev)
 */
export function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`screen-${screenId}`);
    if (target) target.classList.add('active');
}

/**
 * リザルト画面の正答率円形グラフを更新する
 * @param {number} percentage 正答率 (0-100)
 */
export function updateAccuracyCircle(percentage) {
    const radius = 15.9155;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    
    if (elements.accuracyPath) {
        elements.accuracyPath.style.strokeDasharray = `${percentage}, 100`;
    }
    if (elements.accuracyText) {
        elements.accuracyText.textContent = `${Math.round(percentage)}%`;
    }
}

/**
 * 音声波形キャンバスをクリア（真っさらな状態に）する
 */
export function clearCanvas() {
    if (elements.gameWaveformCanvas) {
        const ctx = elements.gameWaveformCanvas.getContext('2d');
        ctx.clearRect(0, 0, elements.gameWaveformCanvas.width, elements.gameWaveformCanvas.height);
    }
}
