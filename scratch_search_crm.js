const fs = require('fs');
const path = require('path');

const rootDir = 'C:/Users/analista2.desarrollo/Desktop/apps/CRM';
const matches = [];

function searchDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      searchDir(fullPath);
    } else if (/\.(ts|tsx|js|json|sql|env.*)$/.test(entry.name)) {
      try {
        const text = fs.readFileSync(fullPath, 'utf-8');
        if (text.includes('comercial2') || text.includes('ef4e2895-cc89-461b-96ca-cc677247f247')) {
          matches.push({ file: fullPath, count: 1 });
        }
      } catch (e) {}
    }
  }
}

searchDir(rootDir);
console.log('Matches in CRM:', matches);
