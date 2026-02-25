// Test script to verify version progress percentages
const fetch = require('node-fetch');

async function testVersions() {
  try {
    const response = await fetch('http://localhost:3000/api/orthodontic-versions?patientId=5887b85e-a706-45bc-b2e8-2b4e4416b4da');
    const data = await response.json();
    
    console.log('Versions for patient:');
    data.versions.forEach(v => {
      console.log(`V${v.versionNumber}: ${v.progressPercentage}% (Current: ${v.isCurrent})`);
    });
    
    const current = data.versions.find(v => v.isCurrent);
    console.log(`\nCurrent version progress: ${current?.progressPercentage}%`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testVersions();
