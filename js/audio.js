// Reversa - オーディオエンジン
import { CONFIG } from '../config.js';

const DB_NAME = 'reversa_audio_v13';
const DB_VERSION = 1;
const STORE_NAME = 'audio_cache';
const SPEECH_RATE = 1.0;

const GLOBAL_PLAYER = {
    audioCtx: null,
    activeSources: []
};

let db = null;

/**
 * Web Audio API コンテキストの取得
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
 * データベースの初期化
 */
export async function initAudio() {
    if (db) return db;
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const dbInstance = event.target.result;
            if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                dbInstance.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * 効果音の再生
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
 * Blobを再生
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
        GLOBAL_PLAYER.activeSources.push(source);
        source.onended = () => {
            GLOBAL_PLAYER.activeSources = GLOBAL_PLAYER.activeSources.filter(s => s !== source);
        };
    } catch (err) { console.error(err); }
}

/**
 * 音声データの取得（キャッシュ対応）
 */
export async function getAudioBlob(word, type = 'orig') {
    if (!db) await initAudio();
    const cacheKey = `${type}_${word}`;
    
    const cached = await new Promise(r => {
        const tx = db.transaction([STORE_NAME], 'readonly');
        const req = tx.objectStore(STORE_NAME).get(cacheKey);
        req.onsuccess = () => r(req.result);
        req.onerror = () => r(null);
    });
    if (cached) return cached;

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
        
        const tx = db.transaction([STORE_NAME], 'readwrite');
        tx.objectStore(STORE_NAME).put(blob, cacheKey);
        return blob;
    } catch (e) { return null; }
}

export function startRecording() {
    console.log("Recording started (Mock)");
    // 実装は簡略化
}

export function stopRecording() {
    console.log("Recording stopped (Mock)");
}
