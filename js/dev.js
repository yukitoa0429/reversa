/**
 * Reversa - デベロッパー・スタジオ制御ロジック (Developer Studio)
 * 
 * 【目的】
 * 本ファイルは、将来的にユーザー（あなた）が自分の声で五十音や単語を録音し、
 * アプリ内の音声素材を自作・カスタマイズしたい場合に備えた「管理者用ツール」です。
 * 
 * 【現状の扱い】
 * v0.2.0 では OpenAI による高品質な AI 音声を標準採用しているため、
 * 通常のプレイでは使用しませんが、独自の音声セットを構築する際の
 * 「素材生成スタジオ」として機能します。
 * 
 * 【主な機能】
 * 1. リスト管理: 五十音、単語、パイロット用フレーズのリストを表示・切替。
 * 2. リアルタイム・ビジュアライザー: 録音中の声の波形を Canvas 上に描画。
 * 3. 録音・再生制御: ブラウザの MediaRecorder を使用した音声のキャプチャと再生。
 * 4. サーバー通信: 録音したデータをバックエンド（server.py）へ送信し、トリミングして保存。
 */

import { elements } from './ui.js';
import { getPlaybackContext } from './audio.js';

// 開発者スタジオの内部状態
const DEV_STATE = {
    currentTab: 'moras',
    selectedItem: null,
    recorder: null,
    chunks: [],
    audioBlob: null
};

/**
 * 開発者スタジオの初期化
 */
export function initDevStudio() {
    setupDevEventListeners();
    renderDevList();
}

/**
 * イベントリスナーの設定
 */
function setupDevEventListeners() {
    // タブ切り替え（50音 / 単語 / パイロット）
    elements.devNavItems.forEach(item => {
        item.addEventListener('click', () => {
            elements.devNavItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            DEV_STATE.currentTab = item.dataset.tab;
            renderDevList();
        });
    });

    // 録音ボタン（手動）
    elements.btnRecordDev.addEventListener('click', () => {
        if (DEV_STATE.recorder && DEV_STATE.recorder.state === 'recording') {
            stopDevRecording();
        } else {
            startDevRecording();
        }
    });

    // 再生ボタン
    elements.btnPlayDev.addEventListener('click', () => {
        if (DEV_STATE.audioBlob) {
            const url = URL.createObjectURL(DEV_STATE.audioBlob);
            const audio = new Audio(url);
            audio.play();
        }
    });

    // 保存ボタン
    elements.btnSaveDev.addEventListener('click', saveDevAudio);
}

/**
 * リスト（50音や単語など）を画面に描画
 */
function renderDevList() {
    const container = elements.devListContainer;
    container.innerHTML = '';
    
    let list = [];
    if (DEV_STATE.currentTab === 'moras') {
        list = ["あ","い","う","え","お","か","き","く","け","こ","さ","し","す","せ","そ","た","ち","つ","て","と","な","に","ぬ","ね","の","は","ひ","ふ","へ","ほ","ま","み","む","め","も","や","ゆ","よ","ら","り","る","れ","ろ","わ","を","ん"];
    } else if (DEV_STATE.currentTab === 'words') {
        list = ["りんご", "みかん", "ばなな", "とけい", "くるま"];
    } else {
        list = ["なつやすみ", "おはよう", "ありがとう"];
    }

    list.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'list-item';
        btn.textContent = item;
        if (DEV_STATE.selectedItem === item) btn.classList.add('selected');
        
        btn.onclick = () => {
            DEV_STATE.selectedItem = item;
            document.querySelectorAll('.list-item').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            elements.devTargetText.textContent = item;
            elements.devStatus.textContent = `${item} が選択されました。録音ボタンを押してください。`;
        };
        container.appendChild(btn);
    });
}

/**
 * 録音開始
 */
async function startDevRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        DEV_STATE.chunks = [];
        DEV_STATE.recorder = new MediaRecorder(stream);
        
        DEV_STATE.recorder.ondataavailable = (e) => DEV_STATE.chunks.push(e.data);
        DEV_STATE.recorder.onstop = () => {
            DEV_STATE.audioBlob = new Blob(DEV_STATE.chunks, { type: 'audio/wav' });
            elements.btnPlayDev.classList.remove('hidden');
            elements.btnSaveDev.classList.remove('hidden');
            elements.devStatus.textContent = '録音が完了しました。保存または再生が可能です。';
        };

        DEV_STATE.recorder.start();
        elements.btnRecordDev.textContent = '⏹ 停止';
        elements.btnRecordDev.classList.add('recording');
        elements.devStatus.textContent = '録音中...';
        
        // 波形の可視化を開始
        visualizeDevWaveform(stream);
    } catch (err) {
        console.error('録音の開始に失敗しました:', err);
        elements.devStatus.textContent = 'マイクの使用が許可されていません。';
    }
}

/**
 * 録音停止
 */
function stopDevRecording() {
    if (DEV_STATE.recorder) {
        DEV_STATE.recorder.stop();
        DEV_STATE.recorder.stream.getTracks().forEach(track => track.stop());
        elements.btnRecordDev.textContent = '🔴 手動録音';
        elements.btnRecordDev.classList.remove('recording');
    }
}

/**
 * サーバーへ音声を保存
 */
async function saveDevAudio() {
    if (!DEV_STATE.audioBlob || !DEV_STATE.selectedItem) return;

    elements.devStatus.textContent = 'サーバーへ保存中...';
    const filename = `${DEV_STATE.selectedItem}.wav`;
    const folder = DEV_STATE.currentTab;

    try {
        const response = await fetch(`http://localhost:8081/upload?filename=${encodeURIComponent(filename)}&folder=${folder}`, {
            method: 'POST',
            body: DEV_STATE.audioBlob
        });

        if (response.ok) {
            elements.devStatus.textContent = `保存完了: ${filename}`;
            elements.btnSaveDev.classList.add('hidden');
        } else {
            throw new Error('サーバーエラー');
        }
    } catch (err) {
        console.error('保存失敗:', err);
        elements.devStatus.textContent = '保存に失敗しました。server.py が起動しているか確認してください。';
    }
}

/**
 * 波形ビジュアライザー (Canvas描画)
 */
function visualizeDevWaveform(stream) {
    const audioCtx = getPlaybackContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const canvas = elements.waveformCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
        if (!DEV_STATE.recorder || DEV_STATE.recorder.state === 'inactive') return;
        requestAnimationFrame(draw);

        analyser.getByteFrequencyData(dataArray);

        // 背景のクリア
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for(let i = 0; i < bufferLength; i++) {
            const h = dataArray[i] / 2;
            // 黒板テーマに合わせた青〜紫のグラデーション風
            ctx.fillStyle = `rgb(${h + 100}, 50, 255)`;
            ctx.fillRect(x, canvas.height - h, barWidth, h);
            x += barWidth + 1;
        }
    }
    draw();
}
