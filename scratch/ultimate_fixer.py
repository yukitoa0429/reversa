import os
import codecs

def fix_reversa():
    base_dir = 'c:/AntigravityProjects/reversa'
    app_js_path = os.path.join(base_dir, 'js/app.js')
    index_html_path = os.path.join(base_dir, 'index.html')

    # --- 1. JS の修正 ---
    content_js = None
    for enc in ['utf-16', 'utf-8-sig', 'utf-8', 'cp932']:
        try:
            with codecs.open(app_js_path, 'r', enc) as f:
                c = f.read()
                if 'function' in c:
                    content_js = c
                    print(f'Read app.js as {enc}')
                    break
        except: continue
    
    if content_js:
        # splitIntoMoras 関数の定義
        mora_code = """
function splitIntoMoras(text) {
    if (!text) return [];
    let hira = katakanaToHiragana(text);
    hira = normalizeText(hira);
    const res = [];
    for (let i = 0; i < hira.length; i++) {
        const char = hira[i];
        const next = hira[i + 1];
        if (next && /[ゃゅょぁぃぅぇぉ]/.test(next)) {
            res.push(char + next);
            i++;
        } else {
            res.push(char);
        }
    }
    return res;
}
"""
        if 'function splitIntoMoras' not in content_js:
            content_js = content_js.replace('function getMoraCount(text) {', mora_code + '\nfunction getMoraCount(text) {')

        # normalizeText のカタカナ対応
        content_js = content_js.replace('let res = text.trim().toLowerCase();', 'let res = katakanaToHiragana(text.trim().toLowerCase());')

        # submitAnswer の大刷新
        old_logic = "    const cleanedAnswer = normalizeText(rawAnswer);\r\n    const normalizedCorrect = normalizeText(currentState.correctAnswer);\r\n    const isCorrect = (cleanedAnswer === normalizedCorrect) && (cleanedAnswer.length === normalizedCorrect.length);"
        if old_logic not in content_js:
            old_logic = "    const cleanedAnswer = normalizeText(rawAnswer);\n    const normalizedCorrect = normalizeText(currentState.correctAnswer);\n    const isCorrect = (cleanedAnswer === normalizedCorrect) && (cleanedAnswer.length === normalizedCorrect.length);"

        new_logic = """    const cleanedAnswer = normalizeText(rawAnswer);
    const userMoras = splitIntoMoras(rawAnswer);
    const correctMoras = splitIntoMoras(currentState.correctAnswer);
    console.log(`正解: ${correctMoras.join('')}, 回答: ${userMoras.join('')}`);
    
    let resultHTML = '';
    let isCorrect = (userMoras.length === correctMoras.length);
    let errorIndices = [];

    correctMoras.forEach((correctMora, i) => {
        const userMora = userMoras[i] || '';
        if (userMora === correctMora) {
            resultHTML += `<span>${userMora}</span>`;
        } else {
            resultHTML += `<span class="wrong-mora" style="color: #ff4d4d; text-decoration: underline; font-weight: bold;">${userMora || '＿'}</span>`;
            isCorrect = false;
            errorIndices.push(i + 1);
        }
    });

    if (userMoras.length > correctMoras.length) {
        isCorrect = false;
        for (let i = correctMoras.length; i < userMoras.length; i++) {
            resultHTML += `<span style="color: #ff4d4d; opacity: 0.7;">${userMoras[i]}</span>`;
        }
    }

    if (errorIndices.length > 0) {
        console.log(`間違い箇所: ${errorIndices.join(', ')}文字目`);
    }

    if (elements.displayUserComparison) {
        elements.displayUserComparison.innerHTML = resultHTML || '(無音・認識不能)';
    }"""
        content_js = content_js.replace(old_logic, new_logic)

        # UI更新を textContent から innerHTML に変更
        content_js = content_js.replace("elements.displayUserAnswer.textContent = cleanedAnswer || '(無音・認識不能)';", "elements.displayUserAnswer.innerHTML = resultHTML || '(無音・認識不能)';")

        # Elements 定義の追加
        content_js = content_js.replace("displayUserAnswer: document.getElementById('display-user-answer'),", "displayUserAnswer: document.getElementById('display-user-answer'),\n        displayUserComparison: document.getElementById('display-user-comparison'),")

        # リセット処理の追加
        content_js = content_js.replace("if (elements.displayCorrectReverse) elements.displayCorrectReverse.textContent = '';", "if (elements.displayCorrectReverse) elements.displayCorrectReverse.textContent = '';\n    if (elements.displayUserComparison) elements.displayUserComparison.innerHTML = '';")

        # ハルシネーションリスト強化
        content_js = content_js.replace('"ご視聴いただき",', '"ご視聴いただき", "ありがとうございます", "ありがとうございました", "ご視聴ありがとうございました", "視聴ありがとうございます",')

        with open(app_js_path, 'w', encoding='utf-8') as f:
            f.write(content_js)
        print('app.js successfully updated and converted to UTF-8.')

    # --- 2. HTML の修正 ---
    content_html = None
    for enc in ['utf-16', 'utf-8-sig', 'utf-8', 'cp932']:
        try:
            with codecs.open(index_html_path, 'r', enc) as f:
                c = f.read()
                if 'html' in c:
                    content_html = c
                    print(f'Read index.html as {enc}')
                    break
        except: continue

    if content_html:
        target = '<div id="display-correct-reverse" class="display-correct-reverse"></div>'
        if 'display-user-comparison' not in content_html:
            new_div = '\n                        <div id="display-user-comparison" class="display-user-comparison" style="margin-top: 10px; font-size: 1.2rem; min-height: 1.5em; opacity: 0.9;"></div>'
            content_html = content_html.replace(target, target + new_div)
        
        with open(index_html_path, 'w', encoding='utf-8') as f:
            f.write(content_html)
        print('index.html successfully updated and converted to UTF-8.')

if __name__ == '__main__':
    fix_reversa()
