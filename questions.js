/**
 * Reversa Question Database (Theme Based)
 * 初級：2〜4文字の日常語
 * 中級：4〜5文字の少し長い単語や自然の言葉
 * 上級：5〜7文字の難易度の高い単語、熟語、挨拶
 */
const QUESTION_DATABASE = {
    beginner: [
        { word: "いぬ", ruby: ["い", "ぬ"], reverse: "ぬい", bg: "bg_beginner_1.png" },
        { word: "ねこ", ruby: ["ね", "こ"], reverse: "こね", bg: "bg_beginner_1.png" },
        { word: "きつね", ruby: ["き", "つ", "ね"], reverse: "ねつき", bg: "bg_beginner_1.png" },
        { word: "さくら", ruby: ["さ", "く", "ら"], reverse: "らくさ", bg: "bg_beginner_1.png" },
        { word: "みかづき", ruby: ["み", "か", "づ", "き"], reverse: "きづかみ", bg: "bg_beginner_2.png" },
        { word: "とうろう", ruby: ["と", "う", "ろ", "う"], reverse: "うろうと", bg: "bg_beginner_2.png" },
        { word: "すぎのき", ruby: ["す", "ぎ", "の", "き"], reverse: "きのぎす", bg: "bg_beginner_3.png" },
        { word: "はし", ruby: ["は", "し"], reverse: "しは", bg: "bg_beginner_3.png" },
        { word: "げんそう", ruby: ["げ", "ん", "そ", "う"], reverse: "うそんげ", bg: "bg_beginner_3.png" },
        { word: "りんご", ruby: ["り", "ん", "ご"], reverse: "ごんり", bg: "bg_beginner_1.png" },
        { word: "みかん", ruby: ["み", "か", "ん"], reverse: "んかみ", bg: "bg_beginner_2.png" },
        { word: "くるま", ruby: ["く", "る", "ま"], reverse: "まるく", bg: "bg_beginner_3.png" },
        { word: "めがね", ruby: ["め", "が", "ね"], reverse: "ねがめ", bg: "bg_beginner_1.png" },
        { word: "テレビ", ruby: ["て", "れ", "び"], reverse: "びれて", bg: "bg_beginner_2.png" },
        { word: "ピアノ", ruby: ["ぴ", "あ", "の"], reverse: "のあぴ", bg: "bg_beginner_3.png" },
        { word: "カラス", ruby: ["か", "ら", "す"], reverse: "すらか", bg: "bg_beginner_1.png" },
        { word: "すずめ", ruby: ["す", "ず", "め"], reverse: "めずす", bg: "bg_beginner_2.png" },
        { word: "うさぎ", ruby: ["う", "さ", "ぎ"], reverse: "ぎさう", bg: "bg_beginner_3.png" },
        { word: "でんわ", ruby: ["で", "ん", "わ"], reverse: "わんで", bg: "bg_beginner_1.png" },
        { word: "カメラ", ruby: ["か", "め", "ら"], reverse: "らめか", bg: "bg_beginner_2.png" },
        { word: "メロン", ruby: ["め", "ろ", "ん"], reverse: "んろめ", bg: "bg_beginner_3.png" },
        { word: "いちご", ruby: ["い", "ち", "ご"], reverse: "ごちい", bg: "bg_beginner_1.png" },
        { word: "すいか", ruby: ["す", "い", "か"], reverse: "かいす", bg: "bg_beginner_2.png" },
        { word: "きっぷ", ruby: ["き", "っ", "ぷ"], reverse: "ぷっき", bg: "bg_beginner_3.png" },
        { word: "きっさてん", ruby: ["き", "っ", "さ", "て", "ん"], reverse: "んてさっき", bg: "bg_beginner_1.png" }, // 少し長めも混ぜる
        { word: "えんぴつ", ruby: ["え", "ん", "ぴ", "つ"], reverse: "つぴんえ", bg: "bg_beginner_2.png" },
        { word: "とけい", ruby: ["と", "け", "い"], reverse: "いけと", bg: "bg_beginner_3.png" }
    ],
    intermediate: [
        { word: "ひまわり", ruby: ["ひ", "ま", "わ", "り"], reverse: "りわまひ", bg: "bg_beginner_1.png" },
        { word: "あさがお", ruby: ["あ", "さ", "が", "お"], reverse: "おがさあ", bg: "bg_beginner_2.png" },
        { word: "うぐいす", ruby: ["う", "ぐ", "い", "す"], reverse: "すいぐう", bg: "bg_beginner_3.png" },
        { word: "ゆうやけ", ruby: ["ゆ", "う", "や", "け"], reverse: "けやうゆ", bg: "bg_beginner_1.png" },
        { word: "どうぶつ", ruby: ["ど", "う", "ぶ", "つ"], reverse: "つぶうど", bg: "bg_beginner_2.png" },
        { word: "ひこうき", ruby: ["ひ", "こ", "う", "き"], reverse: "きうこひ", bg: "bg_beginner_3.png" },
        { word: "カフェイン", ruby: ["か", "ふ", "ぇ", "い", "ん"], reverse: "んいえふか", bg: "bg_beginner_1.png" }, // 小書き文字は個別にするか結合するか。今回は個別
        { word: "おまつり", ruby: ["お", "ま", "つ", "り"], reverse: "りつまお", bg: "bg_beginner_2.png" },
        { word: "にちよう", ruby: ["に", "ち", "よ", "う"], reverse: "うよちに", bg: "bg_beginner_3.png" },
        { word: "たいよう", ruby: ["た", "い", "よ", "う"], reverse: "うよいた", bg: "bg_beginner_1.png" },
        { word: "ふじさん", ruby: ["ふ", "じ", "さ", "ん"], reverse: "んさじふ", bg: "bg_beginner_2.png" },
        { word: "ネクタイ", ruby: ["ね", "く", "た", "い"], reverse: "いたくね", bg: "bg_beginner_3.png" },
        { word: "にんじん", ruby: ["に", "ん", "じ", "ん"], reverse: "んじんに", bg: "bg_beginner_1.png" },
        { word: "さんたく", ruby: ["さ", "ん", "た", "く"], reverse: "くたんさ", bg: "bg_beginner_2.png" },
        { word: "チョコレート", ruby: ["ち", "ょ", "こ", "れ", "ー", "と"], reverse: "とーれこょち", bg: "bg_beginner_3.png" },
        { word: "おにぎり", ruby: ["お", "に", "ぎ", "り"], reverse: "りぎにお", bg: "bg_beginner_1.png" },
        { word: "かいもの", ruby: ["か", "い", "も", "の"], reverse: "のもいか", bg: "bg_beginner_2.png" },
        { word: "おべんとう", ruby: ["お", "べ", "ん", "と", "う"], reverse: "うとんべお", bg: "bg_beginner_3.png" },
        { word: "すべりだい", ruby: ["す", "べ", "り", "だ", "い"], reverse: "いだりべす", bg: "bg_beginner_1.png" },
        { word: "としょかん", ruby: ["と", "しょ", "か", "ん"], reverse: "んかしょと", bg: "bg_beginner_2.png" }, // 小書き文字を結合させるパターン
        { word: "じてんしゃ", ruby: ["じ", "て", "ん", "しゃ"], reverse: "しゃんてじ", bg: "bg_beginner_3.png" },
        { word: "のみもの", ruby: ["の", "み", "も", "の"], reverse: "のもみの", bg: "bg_beginner_1.png" }
    ],
    advanced: [
        { word: "なつやすみ", ruby: ["な", "つ", "や", "す", "み"], reverse: "みすやつな", bg: "bg_beginner_1.png" },
        { word: "しあわせな", ruby: ["し", "あ", "わ", "せ", "な"], reverse: "なせわあし", bg: "bg_beginner_2.png" },
        { word: "あきまつり", ruby: ["あ", "き", "ま", "つ", "り"], reverse: "りつまきあ", bg: "bg_beginner_3.png" },
        { word: "こんにちは", ruby: ["こ", "ん", "に", "ち", "は"], reverse: "はちにんこ", bg: "bg_beginner_1.png" },
        { word: "しんかんせん", ruby: ["し", "ん", "か", "ん", "せ", "ん"], reverse: "んせんかんし", bg: "bg_beginner_2.png" },
        { word: "スマートフォン", ruby: ["す", "ま", "ー", "と", "ふ", "ぉ", "ん"], reverse: "んぉふとーます", bg: "bg_beginner_3.png" },
        { word: "あいうえお", ruby: ["あ", "い", "う", "え", "お"], reverse: "おえういあ", bg: "bg_beginner_1.png" },
        { word: "せんたくき", ruby: ["せ", "ん", "た", "く", "き"], reverse: "きくたんせ", bg: "bg_beginner_2.png" },
        { word: "れいぞうこ", ruby: ["れ", "い", "ぞ", "う", "こ"], reverse: "こうぞいれ", bg: "bg_beginner_3.png" },
        { word: "きょうりゅう", ruby: ["きょ", "う", "りゅ", "う"], reverse: "うりゅうきょ", bg: "bg_beginner_1.png" },
        { word: "ゆうえんち", ruby: ["ゆ", "う", "え", "ん", "ち"], reverse: "ちんえうゆ", bg: "bg_beginner_2.png" },
        { word: "がくせいたち", ruby: ["が", "く", "せ", "い", "た", "ち"], reverse: "ちたいせくが", bg: "bg_beginner_3.png" },
        { word: "きょうかしょ", ruby: ["きょ", "う", "か", "しょ"], reverse: "しょかうきょ", bg: "bg_beginner_1.png" },
        { word: "はくぶつかん", ruby: ["は", "く", "ぶ", "つ", "か", "ん"], reverse: "んかつぶくは", bg: "bg_beginner_2.png" },
        { word: "てんきよほう", ruby: ["て", "ん", "き", "よ", "ほ", "う"], reverse: "うほよきんて", bg: "bg_beginner_3.png" },
        { word: "じこしょうかい", ruby: ["じ", "こ", "しょ", "う", "か", "い"], reverse: "いかうしょこじ", bg: "bg_beginner_1.png" },
        { word: "でんしじしょ", ruby: ["で", "ん", "し", "じ", "しょ"], reverse: "しょじしんで", bg: "bg_beginner_2.png" },
        { word: "おもいでづくり", ruby: ["お", "も", "い", "で", "づ", "く", "り"], reverse: "りくづでいもお", bg: "bg_beginner_3.png" },
        { word: "たんじょうび", ruby: ["た", "ん", "じょ", "う", "び"], reverse: "びうじょんた", bg: "bg_beginner_1.png" },
        { word: "クリスマス", ruby: ["く", "り", "す", "ま", "す"], reverse: "すますりく", bg: "bg_beginner_2.png" },
        { word: "おしょうがつ", ruby: ["お", "しょ", "う", "が", "つ"], reverse: "つがうしょお", bg: "bg_beginner_3.png" }
    ]
};

// 互換性・デバッグ用のリスト
const SAMPLE_WORDS = {
    beginner: QUESTION_DATABASE.beginner.map(q => q.word),
    intermediate: QUESTION_DATABASE.intermediate.map(q => q.word),
    advanced: QUESTION_DATABASE.advanced.map(q => q.word)
};
