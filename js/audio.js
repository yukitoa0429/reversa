// Reversa - オーディオエンジン
// 音声合成（TTS）、データベース（IndexedDB）への保存、再生制御、および録音を担当します。

import { CONFIG } from '../config.js';

// 内部定数
const DB_NAME = 'reversa_audio_v13';
const DB_VERSION = 1;
const STORE_NAME = 'audio_cache';
const SPEECH_RATE = 1.0;

// グローバルな再生状態
const GLOBAL_PLAYER = {
    audioCtx: null,
    activeSources: []
};

let db = null;

/**
 * Web Audio API のコンテキストを取得または作成します。
 */
export function getPlaybackContext() {
    if (!GLOBAL_PLAYER.audioCtx) {
        GLOBAL_PLAYER.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (GLOBAL_PLAYER.audioCtx.state === 'suspended') {
        GLOBAL_PLAYER.audioCtx.resume();
    }
    return GLOBAL_PLAYER.audioCtx;
}

/**
 * データベースを初期化します。
 */
export async function initAudio() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = (event) => {
            db = event.target.result;
            resolve();
        };
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * 効果音を再生します。
 */
export function playSE(type) {
    try {
        const ctx = getPlaybackContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;
        if (type === 'correct') {
            osc.frequency.setValueAtTime(880, now); 
            osc.frequency.setValueAtTime(1108, now + 0.1); 
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(); osc.stop(now + 0.3);
        } else if (type === 'wrong') {
            osc.frequency.setValueAtTime(150, now);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
            osc.start(); osc.stop(now + 0.3);
        }
    } catch (e) { console.warn(e); }
}

/**
 * 音声Blobを再生します。
 */
export async function playBlob(blob) {
    const ctx = getPlaybackContext();
    try {
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();
    } catch (err) { console.error(err); }
}

/**
 * 音声データを取得（キャッシュ優先）
 */
export async function getAudioBlob(word, type = 'orig') {
    if (!db) await initAudio();
    const cacheKey = `${type}_${word}`;
    
    // キャッシュ確認
    const cached = await new Promise(r => {
        const req = db.transaction([STORE_NAME], 'readonly').objectStore(STORE_NAME).get(cacheKey);
        req.onsuccess = () => r(req.result);
        req.onerror = () => r(null);
    });
    if (cached) return cached;

    // OpenAI TTS
    try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: word,
                voice: "onyx",
                speed: SPEECH_RATE
            })
        });
        if (!response.ok) throw new Error();
        const blob = await response.blob();
        
        // 保存
        const tx = db.transaction([STORE_NAME], 'readwrite');
        tx.objectStore(STORE_NAME).put(blob, cacheKey);
        return blob;
    } catch (e) { return null; }
}

// 録音ロジック（簡易版）
let mediaRecorder = null;
let recordedChunks = [];

export function startRecording() {
    recordedChunks = [];
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = e => recordedChunks.push(e.data);
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'audio/wav' });
            // ここでサーバーに送るなどの処理
        };
        mediaRecorder.start();
        console.log('Recording started...');
    });
}

export function stopRecording() {
    if (mediaRecorder) {
        mediaRecorder.stop();
        console.log('Recording stopped.');
    }
}
