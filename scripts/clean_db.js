/**
 * Reversa - 問題データベース・クリーンアップスクリプト
 * 
 * 【目的】
 * questions.js 内の問題データを自動的にメンテナンスし、データの品質を維持します。
 * 
 * 【主な機能】
 * 1. 仕様外の文字の排除: 現在の判定ロジックで対応していない「ゃゅょ（拗音）」や「ー（長音）」等を含む問題を自動削除します。
 * 2. 逆順読みの自動修正: 人間が入力した「reverse」フィールドのタイポを、プログラムが計算した正確な逆順データで上書きします。
 * 
 * 【使い方】
 * ターミナルで `node scripts/clean_db.js` を実行してください。
 */

const fs = require('fs');

// 対象となる問題データのパス
const filePath = 'c:/AntigravityProjects/reversa/questions.js';
const content = fs.readFileSync(filePath, 'utf-8');

// 正規表現を使用して QUESTION_DATABASE オブジェクトの部分を抽出します
const match = content.match(/const QUESTION_DATABASE = (\{[\s\S]*?\});/);
if (!match) {
    console.error("QUESTION_DATABASE が見つかりませんでした。");
    process.exit(1);
}

// 抽出した文字列をオブジェクトとして評価します
let db;
try {
    eval('db = ' + match[1]);
} catch (e) {
    console.error("オブジェクトの解析中にエラーが発生しました:", e);
    process.exit(1);
}

// 排除対象とする文字（現在対応していない特殊な音）
const invalidChars = ['ゃ','ゅ','ょ','ぁ','ぃ','ぅ','ぇ','ぉ','ー'];
let removedCount = 0;
let fixedCount = 0;

// 各難易度（レベル）ごとにループ処理
for (const level of Object.keys(db)) {
    const items = db[level];
    const cleanedItems = [];
    
    for (const item of items) {
        const rubyStr = item.ruby.join('');
        
        // 1. 仕様外の文字が含まれているかチェック
        if (invalidChars.some(c => rubyStr.includes(c))) {
            removedCount++;
            continue; // この項目は削除（新しいリストに追加しない）
        }
        
        // 2. 逆順データ（reverse）の正確性をチェックし、必要なら修正
        const correctReverse = [...item.ruby].reverse().join('');
        if (item.reverse !== correctReverse) {
            item.reverse = correctReverse;
            fixedCount++;
        }
        
        cleanedItems.push(item);
    }
    db[level] = cleanedItems;
}

// 実行結果をログに出力
console.log(`削除完了: 仕様外の文字（拗音・長音など）を含む ${removedCount} 件を削除しました。`);
console.log(`修正完了: 逆順データのタイポ ${fixedCount} 件を自動修正しました。`);
for (const level of Object.keys(db)) {
    console.log(`- ${level}: 残り ${db[level].length} 件`);
}

// オブジェクトを再び JavaScript ファイルの形式に整形して書き戻します
const newJsonStr = JSON.stringify(db, null, 4).replace(/    /g, '        ');
const newContent = content.substring(0, match.index) + "const QUESTION_DATABASE = " + newJsonStr + ";\n" + content.substring(match.index + match[0].length);

try {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log("\nquestions.js の更新が正常に完了しました。✨");
} catch (err) {
    console.error("ファイル書き込み中にエラーが発生しました:", err);
}
