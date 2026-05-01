const fs = require('fs');

const filePath = 'c:/AntigravityProjects/reversa/questions.js';
const content = fs.readFileSync(filePath, 'utf-8');

// Use regex to extract the object string
const match = content.match(/const QUESTION_DATABASE = (\{[\s\S]*?\});/);
if (!match) {
    console.error("Could not find QUESTION_DATABASE");
    process.exit(1);
}

// Evaluate it safely since it's local code
let db;
try {
    eval('db = ' + match[1]);
} catch (e) {
    console.error("Error evaluating object", e);
    process.exit(1);
}

const invalidChars = ['ゃ','ゅ','ょ','ぁ','ぃ','ぅ','ぇ','ぉ','ー'];
let removedCount = 0;
let fixedCount = 0;

for (const level of Object.keys(db)) {
    const items = db[level];
    const cleanedItems = [];
    
    for (const item of items) {
        const rubyStr = item.ruby.join('');
        // Check invalid chars
        if (invalidChars.some(c => rubyStr.includes(c))) {
            removedCount++;
            continue;
        }
        
        // Recalculate reverse
        const correctReverse = [...item.ruby].reverse().join('');
        if (item.reverse !== correctReverse) {
            item.reverse = correctReverse;
            fixedCount++;
        }
        
        cleanedItems.push(item);
    }
    db[level] = cleanedItems;
}

console.log(`Removed ${removedCount} items with Yoon/Chouon/Small chars.`);
console.log(`Fixed reverse typos in ${fixedCount} items.`);
for (const level of Object.keys(db)) {
    console.log(`${level}: ${db[level].length} items remaining.`);
}

// Format back to JS
const newJsonStr = JSON.stringify(db, null, 4).replace(/    /g, '        ');
const newContent = content.substring(0, match.index) + "const QUESTION_DATABASE = " + newJsonStr + ";\n" + content.substring(match.index + match[0].length);

fs.writeFileSync(filePath, newContent, 'utf-8');
console.log("questions.js has been successfully updated.");
