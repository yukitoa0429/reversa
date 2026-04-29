
import json

def to_mora_list(word_hiragana):
    # Basic mora splitter for Japanese
    res = []
    i = 0
    small_chars = "ぁぃぅぇぉゃゅょゎ"
    while i < len(word_hiragana):
        char = word_hiragana[i]
        if i + 1 < len(word_hiragana) and word_hiragana[i+1] in small_chars:
            res.append(char + word_hiragana[i+1])
            i += 2
        else:
            res.append(char)
            i += 1
    return res

def reverse_mora_list(mora_list):
    return "".join(mora_list[::-1])

# Question Databases (No Choon/Youon)
existing_db = {
    "beginner": [
        ("いぬ", "いぬ"), ("ねこ", "ねこ"), ("きつね", "きつね"), ("さくら", "さくら"), 
        ("はし", "はし"), ("りんご", "りんご"), ("みかん", "みかん"), ("くるま", "くるま"), 
        ("めがね", "めがね"), ("からす", "からす"), ("すずめ", "すずめ"), ("うさぎ", "うさぎ")
    ],
    "intermediate": [],
    "advanced": []
}

new_words = {
    "beginner": [
        ("うし", "うし"), ("とり", "とり"), ("かめ", "かめ"), ("さる", "さる"), ("へび", "へび"),
        ("くま", "くま"), ("しか", "しか"), ("あり", "あり"), ("はな", "はな"), ("きり", "きり"),
        ("くじら", "くじら"), ("とら", "とら"), ("ひよこ", "ひよこ"), ("かえる", "かえる"), ("めだか", "めだか"),
        ("さかな", "さかな"), ("ごはん", "ごはん"), ("おちゃ", "おちゃ"), ("みず", "みず"), ("たまご", "たまご"),
        ("うどん", "うどん"), ("そば", "そば"), ("ぽてと", "ぽてと"), ("けーき", "けーき"), ("つくえ", "つくえ"),
        ("いす", "いす"), ("ほん", "ほん"), ("かみ", "かみ"), ("かばん", "かばん"), ("くつ", "くつ"),
        ("ふく", "ふく"), ("かさ", "かさ"), ("まど", "まど"), ("かぎ", "かぎ"), ("さいふ", "さいふ"),
        ("そら", "そら"), ("うみ", "うみ"), ("やま", "やま"), ("もり", "もり"), ("はな", "はな"),
        ("くも", "くも"), ("つき", "つき"), ("ほし", "ほし"), ("にじ", "にじ"), ("かぜ", "かぜ"),
        ("ゆき", "ゆき"), ("くさ", "くさ"), ("かわ", "かわ"), ("いけ", "いけ"), ("あか", "あか"),
        ("あお", "あお"), ("しろ", "しろ"), ("くろ", "くろ"), ("いえ", "いえ"), ("にわ", "にわ"),
        ("まち", "まち"), ("うた", "うた"), ("いま", "いま"), ("あさ", "あさ"), ("ゆめ", "ゆめ")
    ],
    "intermediate": [
        # 5-7 chars (No Youon/Choon)
        ("かたつむり", "かたつむり"), ("ほととぎす", "ほととぎす"), ("おぼろづき", "おぼろづき"), ("あきあかね", "あきあかね"), ("しもばしら", "しもばしら"),
        ("こいのぼり", "こいのぼり"), ("おとしだま", "おとしだま"), ("ひなまつり", "ひなまつり"), ("わらびもち", "わらびもち"), ("かしわもち", "かしわもち"),
        ("だいふくもち", "だいふくもち"), ("ふゆげしき", "ふゆげしき"), ("つきみだんご", "つきみだんご"), ("あまのがわ", "あまのがわ"), ("あかいふね", "あかいふね"),
        ("あきのそら", "あきのそら"), ("はるのやま", "はるのやま"), ("なつのみず", "なつのみず"), ("ふゆのゆき", "ふゆのゆき"), ("つきのひかり", "つきのひかり"),
        ("ほしのよる", "ほしのよる"), ("あおいとり", "あおいとり"), ("しろいくも", "しろいくも"), ("やまのみち", "やまのみち"), ("うみのなみ", "うみのなみ"),
        ("ひかるかぜ", "ひかるかぜ"), ("きいろいはな", "きいろいはな"), ("あかいりんご", "あかいりんご"), ("あまいみかん", "あまいみかん"), ("まるいすいか", "まるいすいか"),
        ("ながいはし", "ながいはし"), ("まるいつくえ", "まるいつくえ"), ("ひろいにわ", "ひろいにわ"), ("ふるいまち", "ふるいまち"), ("たのしいうた", "たのしいうた"),
        ("きれいなえ", "きれいなえ"), ("はやいくるま", "はやいくるま"), ("おもいかばん", "おもいかばん"), ("ひろいうみ", "ひろいうみ"), ("あおいくるま", "あおいくるま"),
        ("やまびこのこえ", "やまびこのこえ"), ("あめあがりのそら", "あめあがりのそら"), ("もりのかくれんぼ", "もりのかくれんぼ"), ("さくらのつぼみ", "さくらのつぼみ"), ("あきのみかく", "あきのみかく"),
        ("ひかりのわ", "ひかりのわ"), ("ふねのたび", "ふねのたび"), ("そらのたび", "そらのたび"), ("ゆめのなか", "ゆめのなか"), ("あさのひかり", "あさのひかり")
    ],
    "advanced": [
        # 8-10 chars (No Youon/Choon)
        ("あまのがわきらきら", "あまのがわきらきら"), ("やまのうえのおてら", "やまのうえのおてら"), ("あめあがりのにじ", "あめあがりのにじ"), ("もりのおんがくかい", "もりのおんがくかい"), ("おひさまのひかり", "おひさまのひかり"),
        ("うみのなかのさかな", "うみのなかのさかな"), ("そらのうえのほし", "そらのうえのほし"), ("おしょうがつのあそび", "おしょうがつのあそび"), ("ひなまつりのうた", "ひなまつりのうた"), ("こいのぼりのうた", "こいのぼりのうた"),
        ("あおぞらのしろいくも", "あおぞらのしろいくも"), ("あかいはなのなまえ", "あかいはなのなまえ"), ("みどりのもりのなか", "みどりのもりのなか"), ("きいろいくつのあと", "きいろいくつのあと"), ("くろいくものかげ", "くろいくものかげ"),
        ("あおいとりのはね", "あおいとりのはね"), ("しろいくまのゆめ", "しろいくまのゆめ"), ("はるのかぜのにおい", "はるのかぜのにおい"), ("なつのうみのあおさ", "なつのうみのあおさ"), ("あきのやまのいろ", "あきのやまのいろ"),
        ("あしたのゆめのなか", "あしたのゆめのなか"), ("きょうのあさのひかり", "きょうのあさのひかり"), ("きのうのよるのほし", "きのうのよるのほし"), ("おとなのひそひそはなし", "おとなのひそひそはなし"),
        ("ひみつのたからもの", "ひみつのたからもの"), ("ふしぎなまほうのつえ", "ふしぎなまほうのつえ"), ("たのしいおまつりのよる", "たのしいおまつりのよる"), ("きれいなみなとのひかり", "きれいなみなとのひかり"), ("しずかなもりのなか", "しずかなもりのなか"),
        ("あかいりんごをたべる", "あかいりんごをたべる"), ("あまいみかんをむく", "あまいみかんをむく"), ("まるいすいかをきる", "まるいすいかをきる"), ("あかいふねにのる", "あかいふねにのる"), ("あおいくるまをまつ", "あおいくるまをまつ"),
        ("きれいなはなをみる", "きれいなはなをみる"), ("たのしいうたをうたう", "たのしいうたをうたう"), ("ひろいうみをわたる", "ひろいうみをわたる"), ("たかいやまにのぼる", "たかいやまにのぼる"), ("あおいとりをさがす", "あおいとりをさがす"),
        ("ふるいまちをあるく", "ふるいまちをあるく"), ("しろいくもをみあげる", "しろいくもをみあげる"), ("あさのひかりをあびる", "あさのひかりをあびる"), ("ゆめのなかであそぶ", "ゆめのなかであそぶ"), ("ほしのよるをまつ", "ほしのよるをまつ"),
        ("はるのひかりのなか", "はるのひかりのなか"), ("なつのなみのこえ", "なつのなみのこえ"), ("あきのむしのこえ", "あきのむしのこえ"), ("ふゆのさむいあさ", "ふゆのさむいあさ"), ("みずうみのほとり", "みずうみのほとり")
    ]
}

def has_forbidden_sound(ruby_text):
    # Check for Choon (ー)
    if "ー" in ruby_text:
        return True
    # Check for Youon/Sokuon/Small chars (ゃ, ゅ, ょ, っ, etc.)
    small_chars = "ぁぃぅぇぉゃゅょゎっ"
    for char in small_chars:
        if char in ruby_text:
            return True
    # Check for Hiragana long vowel patterns
    long_vowel_patterns = ["ああ", "いい", "うう", "ええ", "おお", "おう", "えい"]
    for p in long_vowel_patterns:
        if p in ruby_text:
            return True
    return False

def build_db(category):
    res = []
    seen_words = set()
    bgs = ["bg_beginner_1.png", "bg_beginner_2.png", "bg_beginner_3.png"]
    
    # Add existing
    for word, ruby_text in existing_db[category]:
        if word not in seen_words:
            if has_forbidden_sound(ruby_text):
                continue
            mora_list = to_mora_list(ruby_text)
            res.append({
                "word": word,
                "ruby": mora_list,
                "reverse": reverse_mora_list(mora_list),
                "bg": bgs[len(res) % len(bgs)]
            })
            seen_words.add(word)
    
    # Add new
    for word, ruby_text in new_words[category]:
        if word not in seen_words and len(res) < 100:
            if has_forbidden_sound(ruby_text):
                continue
            mora_list = to_mora_list(ruby_text)
            res.append({
                "word": word,
                "ruby": mora_list,
                "reverse": reverse_mora_list(mora_list),
                "bg": bgs[len(res) % len(bgs)]
            })
            seen_words.add(word)
            
    return res

full_db = {
    "beginner": build_db("beginner"),
    "intermediate": build_db("intermediate"),
    "advanced": build_db("advanced")
}

with open("scratch/questions_new.js", "w", encoding="utf-8") as f:
    f.write("/**\n * Reversa Question Database (Theme Based)\n * 初級：2〜4文字\n * 中級：5〜7文字\n * 上級：8〜10文字\n */\n")
    f.write("const QUESTION_DATABASE = {\n")
    for cat in ["beginner", "intermediate", "advanced"]:
        f.write(f"    {cat}: [\n")
        for item in full_db[cat]:
            f.write(f"        {json.dumps(item, ensure_ascii=False)},\n")
        f.write("    ],\n")
    f.write("};\n\n")
    f.write("const SAMPLE_WORDS = {\n")
    f.write("    beginner: QUESTION_DATABASE.beginner.map(q => q.word),\n")
    f.write("    intermediate: QUESTION_DATABASE.intermediate.map(q => q.word),\n")
    f.write("    advanced: QUESTION_DATABASE.advanced.map(q => q.word)\n")
    f.write("};\n")
