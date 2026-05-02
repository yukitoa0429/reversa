/**
 * Reversa - ユーティリティ関数 (Utils)
 */

/**
 * テキストを正規化（空白除去、小文字化など）します。
 */
function normalizeText(text) {
    if (!text) return "";
    return text.replace(/[\s　、。！]/g, "").toLowerCase();
}

/**
 * カタカナをひらがなに変換します。
 */
function katakanaToHiragana(src) {
    return src.replace(/[\u30a1-\u30f6]/g, function(match) {
        var chr = match.charCodeAt(0) - 0x60;
        return String.fromCharCode(chr);
    });
}

/**
 * ひらがなをカタカナに変換します。
 */
function hiraganaToKatakana(src) {
    return src.replace(/[\u3041-\u3096]/g, function(match) {
        var chr = match.charCodeAt(0) + 0x60;
        return String.fromCharCode(chr);
    });
}

/**
 * 指定時間待機します。
 */
function sleep(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
}
