import fs from 'fs';
const data = JSON.parse(fs.readFileSync('tmp/eslint-report.json', 'utf8'));

// Group by type of pattern
const sourceCounts = {};
const lines = [];

data.forEach(f => {
  f.messages.forEach(m => {
    if (m.ruleId === 'security/detect-object-injection') {
      const path = f.filePath.replace(/\\/g, '/').replace(/^.*?Opttius-app\//, '');
      
      // Skip test files for brevity
      if (path.includes('__tests__')) return;
      
      lines.push({ path, line: m.line });
    }
  });
});

console.log(`Source file warnings: ${lines.length} (${474 - lines.length} in test files)\n`);

// Group by directory
const dirs = {};
lines.forEach(l => {
  const dir = l.path.replace(/\/[^/]+$/, '');
  dirs[dir] = (dirs[dir] || 0) + 1;
});

console.log('By directory:');
Object.entries(dirs).sort((a,b) => b[1]-a[1]).slice(0, 20).forEach(([d, c]) => {
  console.log(`  ${c}  ${d}`);
});
