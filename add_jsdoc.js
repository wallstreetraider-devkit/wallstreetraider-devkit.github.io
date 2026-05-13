const fs = require('fs');

const filePath = 'resources/app/js/api.js';
let content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
let outLines = [];
let inJsDoc = false;

// We will collect contiguous `//` comments directly above an export
let pendingComments = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('/**')) {
        inJsDoc = true;
        outLines.push(line);
        continue;
    }
    if (inJsDoc) {
        outLines.push(line);
        if (trimmed.endsWith('*/')) {
            inJsDoc = false;
        }
        continue;
    }

    if (trimmed.startsWith('//') && !trimmed.startsWith('///')) {
        pendingComments.push(trimmed.substring(2).trim());
        outLines.push(line);
        continue;
    }

    // If it's a blank line or not a comment, and not an export, clear pending comments
    const isExport = trimmed.match(/^export\s+(async\s+)?function\s+([a-zA-Z0-9_]+)\s*\((.*?)\)/) || 
                     trimmed.match(/^export\s+const\s+([a-zA-Z0-9_]+)/);

    if (isExport) {
        // Did the previous line end a JSDoc block?
        const hasJsDoc = outLines.length > 0 && outLines[outLines.length - 1].trim() === '*/' && pendingComments.length === 0;
        
        if (!hasJsDoc) {
            // Need to insert JSDoc right before this line (and before the pendingComments, actually it's easier to just generate it now, 
            // but the pending comments were already pushed. So we need to insert the JSDoc before the pending comments.)
            
            // To keep it simple, we can just replace the pending comments with a JSDoc block.
            // Remove the recently pushed single-line comments from outLines
            outLines.splice(outLines.length - pendingComments.length, pendingComments.length);

            const isFunc = trimmed.startsWith('export async function') || trimmed.startsWith('export function');
            const name = isFunc ? isExport[2] : isExport[1];
            
            let description = pendingComments.join(' ');
            if (!description) {
                // Generate a human readable description from the camelCase name
                description = name.replace(/([A-Z])/g, ' $1').toLowerCase();
                description = description.charAt(0).toUpperCase() + description.slice(1);
            }

            outLines.push(`/**`);
            outLines.push(` * ${description}`);
            
            if (isFunc && isExport[3]) {
                const args = isExport[3].split(',').map(a => a.trim()).filter(a => a);
                for (const argStr of args) {
                    // e.g., "id" or "actingAsId = 0"
                    let argName = argStr.split('=')[0].trim();
                    let type = 'any';
                    if (argName.toLowerCase().includes('id') || argStr.includes('= 0')) {
                        type = 'number';
                    } else if (argName.toLowerCase().includes('str') || argName.toLowerCase().includes('name')) {
                        type = 'string';
                    }
                    
                    let paramStr = ` * @param {${type}} ${argName}`;
                    if (argStr.includes('=')) {
                        const defaultVal = argStr.split('=')[1].trim();
                        paramStr = ` * @param {${type}} [${argName}=${defaultVal}]`;
                    }
                    outLines.push(paramStr);
                }
            }
            if (trimmed.startsWith('export async function')) {
                outLines.push(` * @returns {Promise<any>}`);
            }
            
            outLines.push(` */`);
        }
    }

    if (!trimmed.startsWith('//')) {
        pendingComments = [];
    }

    outLines.push(line);
}

fs.writeFileSync(filePath, outLines.join('\n'));
console.log('Finished adding full JSDoc comments.');
