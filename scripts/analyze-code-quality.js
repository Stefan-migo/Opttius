#!/usr/bin/env node

/**
 * Code Quality Analysis Script
 * Analyzes the current state of the codebase for refactoring opportunities
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  largeFileThreshold: 300, // lines
  complexFunctionThreshold: 50, // lines
  componentDir: './src/components',
  excludePatterns: ['node_modules', '.next', 'dist']
};

// Helper functions
function isExcluded(filePath) {
  return CONFIG.excludePatterns.some(pattern => 
    filePath.includes(pattern)
  );
}

function countLines(content) {
  return content.split('\n').length;
}

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = countLines(content);
    
    return {
      path: filePath,
      lines,
      isLarge: lines > CONFIG.largeFileThreshold,
      extension: path.extname(filePath),
      name: path.basename(filePath)
    };
  } catch (error) {
    console.warn(`Could not read file: ${filePath}`);
    return null;
  }
}

function walkDirectory(dir) {
  let results = [];
  
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      
      if (isExcluded(filePath)) return;
      
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        results = results.concat(walkDirectory(filePath));
      } else if (stat.isFile() && (file.endsWith('.tsx') || file.endsWith('.ts'))) {
        const analysis = analyzeFile(filePath);
        if (analysis) results.push(analysis);
      }
    });
  } catch (error) {
    console.warn(`Could not read directory: ${dir}`);
  }
  
  return results;
}

function generateReport(analyses) {
  const largeFiles = analyses.filter(a => a.isLarge);
  const totalFiles = analyses.length;
  const totalLines = analyses.reduce((sum, a) => sum + a.lines, 0);
  const avgLines = Math.round(totalLines / totalFiles);
  
  console.log('\n📊 CODE QUALITY ANALYSIS REPORT');
  console.log('================================');
  console.log(`Total Files Analyzed: ${totalFiles}`);
  console.log(`Total Lines of Code: ${totalLines.toLocaleString()}`);
  console.log(`Average File Size: ${avgLines} lines`);
  console.log(`Large Files (>300 lines): ${largeFiles.length}`);
  
  if (largeFiles.length > 0) {
    console.log('\n🚨 LARGE FILES IDENTIFIED:');
    console.log('===========================');
    largeFiles
      .sort((a, b) => b.lines - a.lines)
      .slice(0, 10)
      .forEach((file, index) => {
        console.log(`${index + 1}. ${file.name} - ${file.lines} lines (${file.path})`);
      });
  }
  
  // Component-specific analysis
  const componentFiles = analyses.filter(a => a.path.includes('/components/'));
  const adminComponents = componentFiles.filter(a => a.path.includes('/admin/'));
  
  console.log('\n🏗️ COMPONENT ANALYSIS:');
  console.log('======================');
  console.log(`Total Components: ${componentFiles.length}`);
  console.log(`Admin Components: ${adminComponents.length}`);
  
  const largeAdminComponents = adminComponents.filter(c => c.isLarge);
  if (largeAdminComponents.length > 0) {
    console.log('\n🎯 PRIORITY REFACTORING CANDIDATES:');
    console.log('====================================');
    largeAdminComponents
      .sort((a, b) => b.lines - a.lines)
      .forEach(component => {
        console.log(`• ${component.name} (${component.lines} lines)`);
      });
  }
  
  // Generate summary statistics
  const sizeDistribution = {
    small: analyses.filter(a => a.lines < 100).length,
    medium: analyses.filter(a => a.lines >= 100 && a.lines < 300).length,
    large: analyses.filter(a => a.lines >= 300).length
  };
  
  console.log('\n📈 SIZE DISTRIBUTION:');
  console.log('====================');
  console.log(`Small files (<100 lines): ${sizeDistribution.small} (${Math.round(sizeDistribution.small/totalFiles*100)}%)`);
  console.log(`Medium files (100-299 lines): ${sizeDistribution.medium} (${Math.round(sizeDistribution.medium/totalFiles*100)}%)`);
  console.log(`Large files (≥300 lines): ${sizeDistribution.large} (${Math.round(sizeDistribution.large/totalFiles*100)}%)`);
  
  // Recommendations
  console.log('\n💡 REFACTORING RECOMMENDATIONS:');
  console.log('===============================');
  
  if (largeFiles.length > 0) {
    console.log('1. Prioritize breaking down large files (>300 lines)');
    console.log('2. Extract reusable components and hooks');
    console.log('3. Implement consistent patterns across similar components');
  }
  
  if (sizeDistribution.large / totalFiles > 0.1) {
    console.log('4. Consider implementing component size limits in ESLint');
  }
  
  console.log('5. Establish code review guidelines for component complexity');
  console.log('6. Create shared utilities for common functionality');
  
  return {
    totalFiles,
    totalLines,
    avgLines,
    largeFiles: largeFiles.length,
    sizeDistribution,
    recommendations: largeFiles.length > 0
  };
}

// Main execution
function main() {
  console.log('🔍 Analyzing codebase for refactoring opportunities...\n');
  
  const analyses = walkDirectory(CONFIG.componentDir);
  const report = generateReport(analyses);
  
  // Save detailed report
  const reportPath = './reports/code-quality-analysis.json';
  const reportDir = path.dirname(reportPath);
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    config: CONFIG,
    report,
    detailedAnalysis: analyses
  }, null, 2));
  
  console.log(`\n📋 Detailed report saved to: ${reportPath}`);
  console.log('\n✅ Analysis complete!');
}

// Run the analysis
main();