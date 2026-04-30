import re
import json

file_path = 'c:/AntigravityProjects/reversa/questions.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 3文字の新単語リスト（補充用）
supplement_words = ["ゆきぐに", "ひまわり", "あじさい", "おにぎり", "せんべい", "お茶", "ほうじ茶", "あずき", "だいふく", "ようかん"]
# 3文字固定にするため、文字数を厳密にチェックして生成
more_3chars = ["すずめ", "めだか", "からす", "うさぎ", "きつね", "たぬき", "かもめ", "つばめ", "ひよこ", "あひる", "いわし", "さんま", "めだか", "まぐろ", "かつお", "くじら", "いるか", "あざらし", "らっこ", "ぺんぎん", "きりん", "らいおん", "とらだ", "ひょう", "りすだ", "しかだ", "うしだ", "うまき", "ぶただ"]

def create_item(word):
    ruby = list(word)
    processed_ruby = []
    small_chars = "ゃゅょぁぃぅぇぉ"
    for char in ruby:
        if char in small_chars and processed_ruby:
            processed_ruby[-1] += char
        else:
            processed_ruby.append(char)
    reverse = "".join(reversed(processed_ruby))
    return {
        "word": word,
        "ruby": processed_ruby,
        "reverse": reverse,
        "bg": "bg_beginner_1.png"
    }

# beginner配列を抽出
pattern = r'(beginner:\s*\[)(.*?)(\s*\],)'
m = re.search(pattern, content, re.DOTALL)
if m:
    body = m.group(2)
    # 既存のアイテムを抽出
    items = re.findall(r'\{.*?\}', body, re.DOTALL)
    filtered_items = []
    removed_count = 0
    
    for item in items:
        w_match = re.search(r'"word":\s*"(.*?)"', item)
        if w_match:
            word = w_match.group(1)
            # 文字数をカウント（モーラ数ではなく純粋な文字数で判定）
            if len(word) == 3:
                filtered_items.append(item.strip())
            else:
                removed_count += 1
    
    # 削除した分だけ（あるいはそれ以上）補充
    for i in range(max(removed_count, 20)):
        if i < len(more_3chars):
            new_item = create_item(more_3chars[i])
            filtered_items.append(json.dumps(new_item, ensure_ascii=False))
    
    new_body = ",\n        ".join(filtered_items)
    new_content = content.replace(m.group(0), m.group(1) + "\n        " + new_body + "\n    " + m.group(3))

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Cleaned up 2-char words and added 3-char words. Total removed: {removed_count}")
