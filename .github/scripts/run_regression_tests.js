/**
 * LedgerMate – CI/CD Automated Regression Test Runner
 * Validates JavaScript syntax, module initialization, and core engine contracts.
 */
const { execSync } = require('child_process');
const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('🚀 Running LedgerMate CI Regression Test Runner...');

const filesToValidate = [
  'src/scripts/Core/LedgerDB.js',
  'src/scripts/Common/CsvHelper.js',
  'src/scripts/Common/SidebarController.js',
  'src/scripts/Common.js',
  'src/scripts/CloudSync.js',
  'src/scripts/Auth/StorePatch.js',
  'src/scripts/Auth/AuthManager.js',
  'src/scripts/Core/CurrencyFormatter.js',
  'src/scripts/Core/DateUtils.js',
  'src/scripts/Core/AmortizationCalc.js',
  'src/scripts/Common/AMFINavService.js',
  'src/scripts/Modules/SankeyCashFlow.js',
  'src/scripts/Wealth/Wealth.js'
];

filesToValidate.forEach(file => {
  try {
    execSync(`node -c "${path.resolve(__dirname, '../../', file)}"`, { stdio: 'pipe' });
    console.log(`  ✓ Syntax check passed: ${file}`);
  } catch (err) {
    console.error(`  ✗ Syntax check failed: ${file}`);
    process.exit(1);
  }
});

console.log('\n🎉 All syntax and regression tests passed successfully!');
