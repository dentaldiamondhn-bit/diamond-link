// Simple test to verify progress calculation
const { calculateProgress, extractMonthsFromDuration } = require('./utils/progressUtils.ts');

// Test progress calculation
const progress1 = calculateProgress(3, 12, '12 meses');
console.log('Progress 3/12:', progress1);

const progress2 = calculateProgress(6, 12, '12 meses');
console.log('Progress 6/12:', progress2);

const progress3 = calculateProgress(9, 12, '12 meses');
console.log('Progress 9/12:', progress3);
