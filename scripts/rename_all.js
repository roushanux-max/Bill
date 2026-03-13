import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');

const excludeDirs = ['.git', 'node_modules', 'dist', '.gemini', '.supabase'];
const excludeFiles = ['package-lock.json', 'pwa-512x512.png', 'pwa-192x192.png', 'rename_all.js', 'package.json']; // Package.json maybe avoid to not break deps

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
            if (excludeFiles.includes(file)) continue;
            
            // Only process text files
            try {
                let content = fs.readFileSync(fullPath, 'utf8');
                let newContent = content
                    .replace(/BillMint/g, "Bill")
                    .replace(/Billmint/g, "Bill")
                    .replace(/billmint/g, "bill");
                    
                if (content !== newContent) {
                    fs.writeFileSync(fullPath, newContent, 'utf8');
                    console.log(`Updated content: ${fullPath}`);
                }
            } catch (err) {
                // Ignore files that can't be read as utf8 (e.g. binaries)
            }
        }
    }
}

// First pass: rename content
console.log("Replacing content...");
processDir(projectRoot);

// Second pass: rename files
function renameFiles(dir) {
    let files;
    try {
        files = fs.readdirSync(dir);
    } catch (e) { return; }
    
    for (const file of files) {
        if (excludeDirs.includes(file)) continue;
        
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        const newName = file
            .replace(/BillMint/g, "Bill")
            .replace(/Billmint/g, "Bill")
            .replace(/billmint/g, "bill");
            
        let finalPath = fullPath;
        if (newName !== file) {
            finalPath = path.join(dir, newName);
            try {
                fs.renameSync(fullPath, finalPath);
                console.log(`Renamed file: ${fullPath} -> ${finalPath}`);
            } catch (e) {
                console.error(`Failed to rename ${fullPath}`);
            }
        }
        
        if (stat.isDirectory()) {
            renameFiles(finalPath);
        }
    }
}

console.log("Renaming files...");
renameFiles(projectRoot);
console.log("Renaming complete.");
