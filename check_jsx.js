
const fs = require('fs');

function checkBalance(path) {
    const content = fs.readFileSync(path, 'utf8');
    const tags = [];
    const searchTags = ['<main', '</main', '<div', '</div', '<Card', '</Card', '<CardHeader', '</CardHeader', '<CardContent', '</CardContent', '{', '}', '(', ')'];
    
    let lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // Very naive tokenizer
        let pos = 0;
        while (pos < line.length) {
            let found = null;
            let foundIdx = -1;
            
            for (let tag of searchTags) {
                let idx = line.indexOf(tag, pos);
                if (idx !== -1 && (foundIdx === -1 || idx < foundIdx)) {
                    foundIdx = idx;
                    found = tag;
                }
            }
            
            if (found) {
                // Check if it's a self-closing tag
                let isSelfClosing = false;
                if (found.startsWith('<') && !found.startsWith('</')) {
                    let endIdx = line.indexOf('>', foundIdx);
                    if (endIdx !== -1 && line[endIdx - 1] === '/') {
                        isSelfClosing = true;
                    }
                }
                
                if (!isSelfClosing) {
                    if (found === '{' || found === '(' || (found.startsWith('<') && !found.startsWith('</'))) {
                        tags.push({ type: found, line: i + 1, col: foundIdx + 1 });
                    } else {
                        let last = tags.pop();
                        if (!last) {
                            console.log(`Extra closing token '${found}' at line ${i + 1}, col ${foundIdx + 1}`);
                        } else {
                            // Match check (naive)
                            let match = false;
                            if (found === '}' && last.type === '{') match = true;
                            if (found === ')' && last.type === '(') match = true;
                            if (found === '</main' && last.type === '<main') match = true;
                            if (found === '</div' && last.type === '<div') match = true;
                            if (found === '</Card' && last.type === '<Card') match = true;
                            if (found === '</CardHeader' && last.type === '<CardHeader') match = true;
                            if (found === '</CardContent' && last.type === '<CardContent') match = true;
                            
                            if (!match) {
                                console.log(`Mismatched token: opened '${last.type}' at line ${last.line} but closed with '${found}' at line ${i + 1}`);
                                // Put it back to continue finding more
                                // tags.push(last); 
                            }
                        }
                    }
                }
                pos = foundIdx + found.length;
            } else {
                break;
            }
        }
    }
    
    if (tags.length > 0) {
        console.log("Unclosed tokens:");
        tags.forEach(t => console.log(`'${t.type}' at line ${t.line}, col ${t.col}`));
    } else {
        console.log("All tokens balanced (naively)");
    }
}

checkBalance('c:/Users/User/Downloads/Developement/Customize Bill Branding/src/app/pages/CreateInvoice.tsx');
