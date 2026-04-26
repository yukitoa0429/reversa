/**
 * Reversa Question Database (Fixed Word Pool)
 * Format:
 * [level]: [
 *   { word: "単語", ruby: "よみがな", reverse: "よみがな逆順", phonemes: "参考発音" },
 *   ...
 * ]
 */
const QUESTION_DATABASE = {
    3: [
        { word: "からす", ruby: "からす", reverse: "すらか" },
        { word: "めだか", ruby: "めだか", reverse: "かだめ" },
        { word: "すずめ", ruby: "すずめ", reverse: "めずす" },
        { word: "さくら", ruby: "さくら", reverse: "らくさ" },
        { word: "かもめ", ruby: "かもめ", reverse: "めもか" },
        { word: "ひかり", ruby: "ひかり", reverse: "りかひ" },
        { word: "みらい", ruby: "みらい", reverse: "いらみ" },
        { word: "くるま", ruby: "くるま", reverse: "まるく" },
        { word: "こころ", ruby: "こころ", reverse: "ろここ" },
        { word: "いのち", ruby: "いのち", reverse: "ちのい" },
        { word: "きずな", ruby: "きずな", reverse: "なずき" },
        { word: "あした", ruby: "あした", reverse: "たしあ" },
        { word: "みづき", ruby: "みづき", reverse: "きづみ" },
        { word: "ほたる", ruby: "ほたる", reverse: "るたほ" },
        { word: "きつね", ruby: "きつね", reverse: "ねつき" },
        { word: "たぬき", ruby: "たぬき", reverse: "きぬた" },
        { word: "うさぎ", ruby: "うさぎ", reverse: "ぎさう" },
        { word: "すもも", ruby: "すもも", reverse: "ももす" },
        { word: "りんご", ruby: "りんご", reverse: "ごんり" },
        { word: "いちご", ruby: "いちご", reverse: "ごちい" }
    ],
    4: [
        { word: "ひこうき", ruby: "ひこうき", reverse: "きうこひ" },
        { word: "ひまわり", ruby: "ひまわり", reverse: "りわまひ" },
        { word: "あさがお", ruby: "あさがお", reverse: "おがさあ" },
        { word: "うぐいす", ruby: "うぐいす", reverse: "すいぐう" },
        { word: "かたつむり", ruby: "かたつむり", reverse: "りむつたか" }, // 5文字だが4文字目以降も扱い可能
        { word: "ほしぞら", ruby: "ほしぞら", reverse: "らぞしほ" },
        { word: "ゆうやけ", ruby: "ゆうやけ", reverse: "けやうゆ" },
        { word: "すべりだい", ruby: "すべりだい", reverse: "いだりべす" },
        { word: "ぶらんこ", ruby: "ぶらんこ", reverse: "こんらぶ" },
        { word: "おにぎり", ruby: "おにぎり", reverse: "りぎにお" }
    ],
    5: [
        { word: "なつやすみ", ruby: "なつやすみ", reverse: "みすやつな" },
        { word: "しあわせな", ruby: "しあわせな", reverse: "なせわいし" },
        { word: "おくりもの", ruby: "おくりもの", reverse: "のもりくお" },
        { word: "あさごはん", ruby: "あさごはん", reverse: "んはござあ" },
        { word: "あきまつり", ruby: "あきまつり", reverse: "りつまきあ" },
        { word: "ぼうけんに", ruby: "ぼうけんに", reverse: "にんけうぼ" },
        { word: "こんにちは", ruby: "こんにちは", reverse: "はちにんこ" },
        { word: "さようなら", ruby: "さようなら", reverse: "らなうよさ" },
        { word: "ありがとう", ruby: "ありがとう", reverse: "うとがりあ" },
        { word: "だいじょうぶ", ruby: "だいじょうぶ", reverse: "ぶうじょいだ" }
    ],
    // 6文字〜8文字なども順次追加可能な構造
    6: [
        { word: "しんぶんし", ruby: "しんぶんし", reverse: "しんぶんし" }, // 回文
        { word: "あいうえおか", ruby: "あいうえおか", reverse: "かおえういあ" },
        { word: "わごむでっぽう", ruby: "わごむでっぽう", reverse: "うぽっでむごわ" }
    ],
    7: [
        { word: "だいとうりょう", ruby: "だいとうりょう", reverse: "うよんりうとういだ" },
        { word: "あいうえおかき", ruby: "あいうえおかき", reverse: "きかおえういあ" },
        { word: "おもちゃのピアノ", ruby: "おもちゃのぴあの", reverse: "のあぴのゃもちお" }
    ],
    8: [
        { word: "あいうえおかきく", ruby: "あいうえおかきく", reverse: "くきかおえういあ" },
        { word: "てんさいかがくしゃ", ruby: "てんさいかがくしゃ", reverse: "ゃくがかいせんて" },
        { word: "しんかんせんのぞみ", ruby: "しんかんせんのぞみ", reverse: "みぞのんせんかんし" }
    ]
};

// 単語のみのリスト（互換性用）
const SAMPLE_WORDS = {
    3: QUESTION_DATABASE[3].map(q => q.word),
    4: QUESTION_DATABASE[4].map(q => q.word),
    5: QUESTION_DATABASE[5].map(q => q.word)
};
