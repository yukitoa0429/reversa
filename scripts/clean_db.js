/**
 * Reversa - Question Database Cleanup Script (Robust & Stable ASCII version)
 * 
 * [Purpose]
 * Cleans questions.js by removing items with unsupported characters 
 * and fixing reverse sequence typos.
 */

const fs = require('fs');

const filePath = 'c:/AntigravityProjects/reversa/questions.js';

if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf-8');

// Robust extraction: Supports var, const, or let QUESTION_DATABASE
const match = content.match(/(var|const|let)\s+QUESTION_DATABASE\s*=\s*(\{[\s\S]*?\});/);
if (!match) {
    console.error("QUESTION_DATABASE not found in questions.js. Please check variable name.");
    process.exit(1);
}

const varKeyword = match[1]; // Keep original keyword (var/const/let)
let db;
try {
    eval('db = ' + match[2]);
} catch (e) {
    console.error("Parsing error:", e);
    process.exit(1);
}

const invalidChars = ['\u3083', '\u3085', '\u3087', '\u3041', '\u3043', '\u3045', '\u3047', '\u3049', '\u30fc'];

let removedCount = 0;
let fixedCount = 0;

for (const level of Object.keys(db)) {
    const items = db[level];
    if (!Array.isArray(items)) continue;

    const cleanedItems = [];
    for (const item of items) {
        const rubyStr = item.ruby.join('');
        
        const hasInvalid = invalidChars.some(c => rubyStr.includes(c));
        if (hasInvalid) {
            removedCount++;
            continue;
        }
        
        const correctReverse = [...item.ruby].reverse().join('');
        if (item.reverse !== correctReverse) {
            item.reverse = correctReverse;
            fixedCount++;
        }
        
        cleanedItems.push(item);
    }
    db[level] = cleanedItems;
}

const newJsonStr = JSON.stringify(db, null, 8).replace(/        /g, '\t');
const newContent = content.substring(0, match.index) + varKeyword + " QUESTION_DATABASE = " + newJsonStr + ";\n" + content.substring(match.index + match[0].length);

try {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log("Cleanup Results:");
    console.log("- Removed (Unsupported Chars): " + removedCount);
    console.log("- Fixed (Reverse Typos): " + fixedCount);
    console.log("\nquestions.js updated successfully! ✨");
} catch (err) {
    console.error("Write error:", err);
}
