/**
 * Reversa - グローバル状態管理 (Global State Management)
 * 
 * 【目的】
 * アプリケーション全体の「現在の状況（ステート）」を一括管理します。
 * ゲームの進行状況、スコア、ユーザーの設定、録音データなど、
 * 複数のプログラム（game.js, ui.js等）で共有が必要な情報を保持する「アプリのメモリ」の役割を果たします。
 * 
 * 【主な管理項目】
 * 1. 進行状況: 現在の画面、問題番号、現在のレベル。
 * 2. ゲームデータ: 今解いている問題の正解、出題リスト、過去の出題履歴。
 * 3. ユーザー設定: 音声読み上げの有無、ブラインドモード（文字を隠す）のON/OFFなど。
 * 4. 音声制御: 録音中のデータ（Chunks）、再生中のコンテキスト管理。
 */

// 音声再生エンジンの管理オブジェクト
export let GLOBAL_PLAYER = {
    audioCtx: null,      // Web Audio API のコンテキスト
    activeSources: []    // 現在再生中の音声ソースのリスト（一括停止用）
};

// 読み込まれた問題データベースの参照用
export let db;

// アプリの現在の動的な状態（この変数を書き換えることでゲームが進行します）
export let currentState = {
    screen: 'home',      // 現在表示中の画面 (home, loading, game, result, dev)
    level: 3,            // 選択された難易度（文字数）
    currentQuestion: 0,  // 現在の設問番号 (1〜10)
    score: 0,            // 現在の正解数
    correctAnswer: '',   // 現在の問題の正解（逆順テキスト）
    originalWord: '',    // 現在の問題の元の単語
    originalSequence: [],// 現在の問題の音節ごとの配列
    isReading: false,    // AIが問題を読み上げ中かどうか
    mediaRecorder: null, // ブラウザの録音オブジェクト
    audioChunks: [],     // 録音された音声データの断片
    recordingTimer: null,// 録音時間制限用のタイマー
    countdownInterval: null, // 画面上のカウントダウン用
    isRecording: false,  // 録音中かどうか
    currentAudioBlob: null,  // 最後に録音された音声ファイル
    activeAudio: null,   // 現在再生中のAudioオブジェクト
    questionSet: [],     // 今回のターンの10問リスト
    turnLogs: [],        // 今回のターンの結果履歴（リザルト画面用）
    recentQuestions: [], // 問題の重複を避けるための直近の履歴
    isSilent: false,     // 音声読み上げをミュートするか（設定）
    isBlind: true,       // 文字を隠すブラインドモードか（設定）
    useNaturalVoice: true // OpenAIによる自然な音声を使用するか（設定）
};
