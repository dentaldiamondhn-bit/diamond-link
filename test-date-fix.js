// Test script to verify date formatting fix
// This can be run in the browser console to test

// Import the function (you can copy this into browser console)
function formatDateForDisplay(dateString, options = {}) {
  if (!dateString) return '';
  
  try {
    let date;
    
    if (typeof dateString === 'string') {
      // Parse the date string - treat it as local date (not UTC)
      const dateStr = dateString.trim();
      const [year, month, day] = dateStr.split('-').map(Number);
      
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        // Create date in local timezone (not UTC) to avoid timezone offset issues
        date = new Date(year, month - 1, day);
      } else {
        // Fallback for other date formats
        date = new Date(dateStr);
      }
    } else if (dateString instanceof Date) {
      date = dateString;
    } else {
      return '';
    }
    
    if (isNaN(date.getTime())) {
      return '';
    }
    
    const { format = 'short', includeTime = false } = options;
    
    const dateOptions = {
      year: 'numeric',
      month: format === 'numeric' ? '2-digit' : format === 'short' ? 'short' : 'long',
      day: '2-digit',
      ...(includeTime && {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    };
    
    return date.toLocaleDateString('es-HN', dateOptions);
  } catch (error) {
    console.error('Error formatting date:', error);
    return String(dateString);
  }
}

// Test cases
console.log('=== Date Formatting Test ===');
console.log('Input: 2026-01-25');
console.log('Output:', formatDateForDisplay('2026-01-25'));
console.log('Expected: 25 de enero de 2026 (or similar Spanish format)');
console.log('');

console.log('Input: 2026-01-01');
console.log('Output:', formatDateForDisplay('2026-01-01'));
console.log('Expected: 1 de enero de 2026');
console.log('');

console.log('Input: 2025-12-31');
console.log('Output:', formatDateForDisplay('2025-12-31'));
console.log('Expected: 31 de diciembre de 2025');
console.log('');

// Test the getTodayForDatabase function
function getTodayForDatabase() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

console.log('Today in database format:', getTodayForDatabase());
console.log('Today formatted:', formatDateForDisplay(getTodayForDatabase()));
