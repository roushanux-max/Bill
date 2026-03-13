import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');

const targets = [
    'bill',
    'bill'
];
const replacement = 'bill';

const excludeDirs = ['.git', 'node_modules', 'dist', '.gemini'];

function processDir(dir) {
    let files;
    try {
        files = fs.readdirSync(dir);
    } catch (e) { return; }
    
    for (const file of files) {
        if (excludeDirs.includes(file)) continue;
        
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            processDir(fullPath);
        } else {
            // Process ALL files that might contain strings (including .env files)
            try {
                let content = fs.readFileSync(fullPath, 'utf8');
                let newContent = content;
                targets.forEach(target => {
                    const regex = new RegExp(target, 'gi');
                    newContent = newContent.replace(regex, replacement);
                });
                    
                if (content !== newContent) {
                    fs.writeFileSync(fullPath, newContent, 'utf8');
                    console.log(`Updated content: ${fullPath}`);
                }
            } catch (err) {
                // Ignore binaries
            }
        }
    }
}

console.log(`Replacing ${targets.join(', ')} with ${replacement}...`);
processDir(projectRoot);
console.log("Sync complete.");
