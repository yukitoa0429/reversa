/**
 * Reversa Question Database (Theme Based)
 * Format:
 * [theme]: [
 *   { word: "単語", ruby: ["よ", "み", "が", "な"], reverse: "ながみよ", bg: "背景画像のファイル名" },
 *   ...
 * ]
 */
const QUESTION_DATABASE = {
    beginner: [
        // 背景1: 桜とキツネ
        { word: "きつね", ruby: ["き", "つ", "ね"], reverse: "ねつき", bg: "bg_beginner_1.png" },
        { word: "さくら", ruby: ["さ", "く", "ら"], reverse: "らくさ", bg: "bg_beginner_1.png" },
        
        // 背景2: 三日月と灯篭
        { word: "みかづき", ruby: ["み", "か", "づ", "き"], reverse: "きづかみ", bg: "bg_beginner_2.png" },
        { word: "とうろう", ruby: ["と", "う", "ろ", "う"], reverse: "うろうと", bg: "bg_beginner_2.png" },
        
        // 背景3: 杉の木と橋と幻想
        { word: "すぎのき", ruby: ["す", "ぎ", "の", "き"], reverse: "きのぎす", bg: "bg_beginner_3.png" },
        { word: "はし", ruby: ["は", "し"], reverse: "しは", bg: "bg_beginner_3.png" },
        { word: "げんそう", ruby: ["げ", "ん", "そ", "う"], reverse: "うそんげ", bg: "bg_beginner_3.png" }
    ],
    intermediate: [
        { word: "ひまわり", ruby: ["ひ", "ま", "わ", "り"], reverse: "りわまひ", bg: "default" },
        { word: "あさがお", ruby: ["あ", "さ", "が", "お"], reverse: "おがさあ", bg: "default" },
        { word: "うぐいす", ruby: ["う", "ぐ", "い", "す"], reverse: "すいぐう", bg: "default" },
        { word: "ゆうやけ", ruby: ["ゆ", "う", "や", "け"], reverse: "けやうゆ", bg: "default" }
    ],
    advanced: [
        { word: "なつやすみ", ruby: ["な", "つ", "や", "す", "み"], reverse: "みすやつな", bg: "default" },
        { word: "しあわせな", ruby: ["し", "あ", "わ", "せ", "な"], reverse: "なせわあし", bg: "default" }, // 修正: あ→あ
        { word: "あきまつり", ruby: ["あ", "き", "ま", "つ", "り"], reverse: "りつまきあ", bg: "default" },
        { word: "こんにちは", ruby: ["こ", "ん", "に", "ち", "は"], reverse: "はちにんこ", bg: "default" }
    ]
};

// 互換性・デバッグ用のリスト
const SAMPLE_WORDS = {
    beginner: QUESTION_DATABASE.beginner.map(q => q.word),
    intermediate: QUESTION_DATABASE.intermediate.map(q => q.word),
    advanced: QUESTION_DATABASE.advanced.map(q => q.word)
};
