
const fs = require('fs');
const path = 'c:/Users/User/Downloads/Developement/Customize Bill Branding/src/app/pages/CreateInvoice.tsx';
const content = fs.readFileSync(path, 'utf8');
let stack = [];
let lines = content.split(/\r?\n/);

for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    let line = lines[lineIdx];
    for (let charIdx = 0; charIdx < line.length; charIdx++) {
        let char = line[charIdx];
        if (char === '{') {
            stack.push({ line: lineIdx + 1, char: charIdx + 1 });
        } else if (char === '}') {
            if (stack.length === 0) {
                console.log(`Extra closing brace found at Line ${lineIdx + 1}, Column ${charIdx + 1}`);
                console.log(`Line content: ${line}`);
            } else {
                stack.pop();
            }
        }
    }
}

if (stack.length > 0) {
    console.log(`${stack.length} unclosed opening braces:`);
    stack.forEach(s => console.log(`Opening brace at Line ${s.line}, Column ${s.char}`));
} else {
    console.log("Braces are balanced");
}
