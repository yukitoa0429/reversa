// Reversa - ユーティリティ関数
// 文字列変換、モーラ数計算、WAVエンコードなどの共通処理を行います。

function katakanaToHiragana(src) {
    if (!src) return "";
    return src.replace(/[\u30a1-\u30f6]/g, function(match) {
        var chr = match.charCodeAt(0) - 0x60;
        return String.fromCharCode(chr);
    });
}

function hiraganaToKatakana(src) {
    if (!src) return "";
    return src.replace(/[\u3041-\u3096]/g, function(match) {
        var chr = match.charCodeAt(0) + 0x60;
        return String.fromCharCode(chr);
    });
}

function numberToPhonetic(src) {
    const map = { '0': 'まる', '1': 'いち', '2': 'に', '3': 'さん', '4': 'よん', '5': 'ご', '6': 'ろく', '7': 'なな', '8': 'はち', '9': 'きゅう' };
    return src.toString().split('').map(c => map[c] || c).join('、');
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

/**
 * テキストを判定および表示用に正規化（お掃除）します。
 */
function normalizeText(text) {
    if (!text) return "";
    let res = text.trim().toLowerCase();
    
    // ① 文頭の不要な言葉を除去（Whisperが勝手に付ける場合があるため）
    res = res.replace(/^(答えは|回答は|単語は|いうのは|それは|正解は)[、。\s:：]*/g, "");
    
    // ② 文末の丁寧語を除去
    res = res.replace(/(です|でした|になります)[。\.!\?]*$/g, ""); 
    
    // ③ 各種記号を除去
    res = res.replace(/[「」『』（）\(\)\[\]"']/g, ""); 
    
    // ④ 漢数字・全角数字を半角数字に統一
    const kanjiMap = { '〇': '0', '一': '1', '二': '2', '三': '3', '四': '4', '五': '5', '六': '6', '七': '7', '八': '8', '九': '9' };
    res = res.replace(/[〇一二三四五六七八九]/g, m => kanjiMap[m]);
    res = res.replace(/[０-９]/g, m => String.fromCharCode(m.charCodeAt(0) - 0xFEE0));
    
    // ⑤ 句読点、空白、記号を除去
    res = res.replace(/[、。！?？\s\-・,._]/g, "");
    
    // ⑥ 最終的に「ひらがな」と「数字」以外の文字（漢字など）を全て除去
    res = res.replace(/[^\u3041-\u30960-9]/g, ""); 
    return res;
}

/**
 * モーラ数（音の拍数）を正確に計算します。
 * 拗音（ゃゅょ等）を1拍として数えるための処理を含みます。
 */
function getMoraCount(text) {
    if (!text) return 0;
    let hira = katakanaToHiragana(text);
    hira = normalizeText(hira);
    const smallChars = /[ゃゅょぁぃぅぇぉ]/g;
    return hira.length - (hira.match(smallChars) || []).length;
}

/**
 * Minimal JS WAV Encoder
 */
function exportWAV(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; 
    const bitDepth = 16;
    const blockAlign = 1 * bitDepth / 8;
    const byteRate = sampleRate * blockAlign;
    
    let samples;
    if (audioBuffer.numberOfChannels === 1) {
        samples = audioBuffer.getChannelData(0);
    } else {
        const ch0 = audioBuffer.getChannelData(0);
        const ch1 = audioBuffer.getChannelData(1);
        samples = new Float32Array(ch0.length);
        for (let i = 0; i < ch0.length; i++) {
            samples[i] = (ch0[i] + (ch1[i] || 0)) / 2;
        }
    }
    const dataLen = samples.length * (bitDepth / 8);
    const buffer = new ArrayBuffer(44 + dataLen);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLen, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLen, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

/**
 * 音声データの冒頭の無音部分をカットします。
 */
function trimAudioBuffer(audioBuffer) {
    const threshold = 0.02;
    const samples = audioBuffer.getChannelData(0);
    let start = 0;
    for (let i = 0; i < samples.length; i++) {
        if (Math.abs(samples[i]) > threshold) {
            start = i;
            break;
        }
    }
    if (start === 0) return audioBuffer;

    const trimmedLength = audioBuffer.length - start;
    const ctx = getPlaybackContext();
    const trimmedBuffer = ctx.createBuffer(
        audioBuffer.numberOfChannels,
        trimmedLength,
        audioBuffer.sampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const oldData = audioBuffer.getChannelData(channel);
        const newData = trimmedBuffer.getChannelData(channel);
        newData.set(oldData.subarray(start));
    }
    return trimmedBuffer;
}
