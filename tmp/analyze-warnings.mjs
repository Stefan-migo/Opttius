import fs from 'fs';
const data = JSON.parse(fs.readFileSync('tmp/eslint-report.json', 'utf8'));

// Errors by non-restricted rule
const errors = {};
const secByFile = {};
let secTotal = 0;

data.forEach(f => {
  f.messages.forEach(m => {
    if (m.severity === 1 && m.ruleId === 'security/detect-object-injection') {
      secTotal++;
      const path = f.filePath.replace(/\\/g, '/');
      const relPath = path.replace(/^.*?Opttius-app\//, '');
      secByFile[relPath] = (secByFile[relPath] || 0) + 1;
      
      if (secTotal <= 15) {
        console.log(`  ${relPath}:${m.line}  ${m.message.slice(0, 100)}`);
      }
    }
  });
});

console.log(`\nTotal: ${secTotal} warnings`);
console.log(`\nTop files:`);
Object.entries(secByFile)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .forEach(([path, count]) => console.log(`  ${count}  ${path}`));
