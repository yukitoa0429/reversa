// Reversa - オーディオエンジン
// 音声合成（TTS）、データベース（IndexedDB）への保存、再生制御、および録音を担当します。

var DB_NAME = 'reversa_audio_v13';
var DB_VERSION = 1;
var STORE_NAME = 'audio_cache';
var SPEECH_RATE = 1.0;

var GLOBAL_PLAYER = {
    audioCtx: null,
    activeSources: []
};

var db = null;

/**
 * Web Audio API コンテキストの取得
 */
function getPlaybackContext() {
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
async function initAudio() {
    if (db) return db;
    return new Promise(function(resolve, reject) {
        var request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = function(event) {
            var dbInstance = event.target.result;
            if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                dbInstance.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = function(event) {
            db = event.target.result;
            resolve(db);
        };
        request.onerror = function(event) { reject(event.target.error); };
    });
}

/**
 * 効果音の再生
 */
function playSE(type) {
    try {
        var ctx = getPlaybackContext();
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        var now = ctx.currentTime;
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
async function playBlob(blob) {
    var ctx = getPlaybackContext();
    try {
        var arrayBuffer = await blob.arrayBuffer();
        var audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        var source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();
        GLOBAL_PLAYER.activeSources.push(source);
        source.onended = function() {
            GLOBAL_PLAYER.activeSources = GLOBAL_PLAYER.activeSources.filter(function(s) { return s !== source; });
        };
    } catch (err) { console.error(err); }
}

/**
 * 音声データの取得（キャッシュ対応）
 */
async function getAudioBlob(word, type) {
    if (!type) type = 'orig';
    if (!db) await initAudio();
    var cacheKey = type + "_" + word;
    
    var cached = await new Promise(function(r) {
        var tx = db.transaction([STORE_NAME], 'readonly');
        var req = tx.objectStore(STORE_NAME).get(cacheKey);
        req.onsuccess = function() { r(req.result); };
        req.onerror = function() { r(null); };
    });
    if (cached) return cached;

    try {
        var response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + window.CONFIG.OPENAI_API_KEY,
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
        var blob = await response.blob();
        
        var tx = db.transaction([STORE_NAME], 'readwrite');
        tx.objectStore(STORE_NAME).put(blob, cacheKey);
        return blob;
    } catch (e) { return null; }
}

var mediaRecorder = null;
function startRecording() { console.log("Recording started"); }
function stopRecording() { console.log("Recording stopped"); }

// システム起動
initAudio().catch(console.error);
