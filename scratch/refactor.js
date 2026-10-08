const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = dir + '/' + file;
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else if (name.endsWith('.ts')) {
      files.push(name);
    }
  }
  return files;
}

const queries = getFiles('lib/supabase/queries').filter(f => f.includes('fibra_') || f.includes('fibra.ts'));

let changes = 0;
queries.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;

  content = content.replace(/registroId: number/g, 'registrer: string');
  content = content.replace(/\.eq\('id', registroId\)/g, ".eq('registrer', registrer)");

  content = content.replace(/registroIds: number\[\]/g, 'registrers: string[]');
  content = content.replace(/\.in\('id', registroIds\)/g, ".in('registrer', registrers)");

  if (content !== original) {
    fs.writeFileSync(f, content);
    console.log('Updated', f);
    changes++;
  }
});
console.log('Total backend files updated:', changes);
