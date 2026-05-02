/**
 * Reversa - ユーティリティ関数ライブラリ (Utility Functions)
 * 
 * 【目的】
 * アプリ全体の「縁の下の力持ち」として、複雑な文字列処理、データ変換、音声エンコード
 * などの共通ロジックを提供します。
 * 
 * 【主な活躍シーン】
 * 1. 判定の適正化: normalizeText 関数は、ユーザーの音声回答に含まれる「です/ます」などの
 *    不要な語句を自動削除し、AIが生成したテキストを純粋な「ひらがな/数字」に揃えます。
 *    これにより、多少の言い回しの違いがあっても正しく正解判定ができるようになります。
 * 2. 音声互換性の確保: encodeWAV 関数は、ブラウザ内の生の音声データを、
 *    Whisper API や Python サーバーが扱える標準的な WAV フォーマットに変換します。
 * 3. 文字種の統一: ひらがな・カタカナの相互変換を行い、音声合成エンジンへの最適な入力と、
 *    内部ロジックでの比較のしやすさを両立させています。
 */

/**
 * カタカナをひらがなに変換します。
 * (AIへの読み上げ指示はカタカナが強いため、内部判定用にひらがなに戻す際などに使用)
 */
export function katakanaToHiragana(src) {
    if (!src) return "";
    return src.replace(/[\u30a1-\u30f6]/g, function(match) {
        var chr = match.charCodeAt(0) - 0x60;
        return String.fromCharCode(chr);
    });
}

/**
 * ひらがなをカタカナに変換します。
 * (AI音声合成エンジンに、より正確な発音を促す際などに使用)
 */
export function hiraganaToKatakana(src) {
    if (!src) return "";
    return src.replace(/[\u3041-\u3096]/g, function(match) {
        var chr = match.charCodeAt(0) + 0x60;
        return String.fromCharCode(chr);
    });
}

/**
 * 数字（1, 2...）を読み上げ用のひらがな（いち、に...）に変換します。
 */
export function numberToPhonetic(src) {
    const map = { '0': 'まる', '1': 'いち', '2': 'に', '3': 'さん', '4': 'よん', '5': 'ご', '6': 'ろく', '7': 'なな', '8': 'はち', '9': 'きゅう' };
    return src.toString().split('').map(c => map[c] || c).join('、');
}

/**
 * 非同期の待機処理（スリープ）を行います。
 */
export function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

/**
 * 判定精度を上げるため、テキストを「お掃除（正規化）」します。
 * 文頭の「答えは〜」や文末の「〜です」などを取り除き、ひらがなと数字のみの純粋なデータにします。
 */
export function normalizeText(text) {
    if (!text) return "";
    let res = text.trim().toLowerCase();
    
    // ① 文頭の不要な言葉を除去
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
 * 文字の拍数（モーラ数）を計算します。
 * ※拗音（ゃゅょ）を一拍として数えるためのロジック。
 */
export function getMoraCount(text) {
    if (!text) return 0;
    // 拗音（ゃゅょ）を前の文字に含めて一拍としてカウント
    return text.replace(/[ぁぃぅぇぉゃゅょ]/g, '').length;
}

/**
 * ブラウザの生の音声データ（Float32）を、
 * 16bitリニアPCM形式の WAV ファイルデータにエンコードします。
 */
export function encodeWAV(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* RIFF chunk length */
    view.setUint32(4, 36 + samples.length * 2, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, 1, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * 2, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 2, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);

    floatTo16BitPCM(view, 44, samples);

    return view;
}

function floatTo16BitPCM(output, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}
