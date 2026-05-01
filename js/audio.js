// Reversa - Audio Engine (TTS, Database, Playback)

function getPlaybackContext() {
    if (!GLOBAL_PLAYER.audioCtx) {
        GLOBAL_PLAYER.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (GLOBAL_PLAYER.audioCtx.state === 'suspended') {
        GLOBAL_PLAYER.audioCtx.resume();
    }
    return GLOBAL_PLAYER.audioCtx;
}

// --- Sound Effects (SE) ---
function playSE(type) {
    try {
        const ctx = getPlaybackContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        if (type === 'start') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'correct') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now); 
            osc.frequency.setValueAtTime(1108.73, now + 0.15); 
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        } else if (type === 'wrong') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        }
    } catch (e) {
        console.warn("SE Playback failed:", e);
    }
}

// --- Database Logic (IndexedDB) ---
function initDB() {
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

async function getCachedAudio(key) {
    if (!db) return null;
    return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
    });
}

async function saveCachedAudio(key, blob) {
    if (!db) return;
    return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(blob, key);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
    });
}

// --- Audio Playback ---
async function playBlob(blob, fadeTime = 0.015) {
    const ctx = getPlaybackContext();
    try {
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        return playBuffer(audioBuffer, fadeTime);
    } catch (err) {
        console.error("playBlob error:", err);
    }
}

function playBuffer(audioBuffer, fadeTime = 0.015) {
    const ctx = getPlaybackContext();
    return new Promise((resolve) => {
        try {
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            const gainNode = ctx.createGain();
            source.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            const now = ctx.currentTime;
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(1, now + fadeTime);
            
            const duration = audioBuffer.duration;
            if (duration > fadeTime * 2) {
                gainNode.gain.setValueAtTime(1, now + duration - fadeTime);
                gainNode.gain.linearRampToValueAtTime(0, now + duration);
            }
            
            source.start(now);
            GLOBAL_PLAYER.activeSources.push(source);
            source.onended = () => {
                GLOBAL_PLAYER.activeSources = GLOBAL_PLAYER.activeSources.filter(s => s !== source);
                resolve();
            };
        } catch (err) {
            console.error("playBuffer error:", err);
            resolve();
        }
    });
}

function stopAllPlayback() {
    GLOBAL_PLAYER.activeSources.forEach(source => {
        try { source.stop(); } catch(e) {}
    });
    GLOBAL_PLAYER.activeSources = [];
}

// --- TTS ---
async function getAudioBlob(word, type = 'orig') {
    const prefix = (type === 'rev') ? 'v13_rev_' : `v13_${type}_`;
    const cacheKey = `${prefix}${word}`;
    
    const cachedBlob = await getCachedAudio(cacheKey);
    if (cachedBlob) return cachedBlob;

    try {
        let textToSpeak = (type === 'rev' || type === 'orig') ? word : word.split('').join('  ');
        if (textToSpeak.trim() === 'ん' || textToSpeak.trim() === 'ン') textToSpeak = 'んー';
        
        let currentSpeed = SPEECH_RATE;
        if (type === 'parts') {
            currentSpeed = 0.95;
            if (!textToSpeak.includes('、')) textToSpeak += '、';
        }
        
        textToSpeak = hiraganaToKatakana(textToSpeak);
        
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: textToSpeak,
                voice: "onyx",
                speed: currentSpeed
            })
        });

        if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
        const blob = await response.blob();
        await saveCachedAudio(cacheKey, blob);
        return blob;
    } catch (e) {
        console.warn("Cloud TTS failed, falling back to local/other", e);
    }

    const extensions = ['wav', 'mp3'];
    for (const ext of extensions) {
        let localPath = (type === 'parts' || type === 'words') 
            ? `assets/audio/${type}/${word}.${ext}?v=5`
            : `assets/audio/${word.length}/${word}_${type}.${ext}?v=5`;

        try {
            const response = await fetch(localPath);
            if (response.ok) return await response.blob();
        } catch (e) { /* ignore */ }
    }
    return null;
}
