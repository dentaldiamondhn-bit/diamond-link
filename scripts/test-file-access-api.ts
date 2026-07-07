// Test script for file access API
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const API_BASE = 'http://localhost:3000/api/agent/file-access';
const HEADERS = {
  'x-internal-call': 'true'
};

async function testFileAccessAPI() {
  console.log('🧪 Testing File Access API...\n');

  // Test 1: List directory
  console.log('Test 1: List directory');
  try {
    const response = await fetch(`${API_BASE}?operation=list&path=/home/dentaldiamondhn/diamond-link-original/components`, { headers: HEADERS });
    const data = await response.json();
    console.log('✅ List directory:', response.ok ? 'SUCCESS' : 'FAILED');
    if (response.ok) {
      console.log(`   Found ${data.files?.length || 0} files`);
    } else {
      console.log('   Error:', data.error);
    }
  } catch (error) {
    console.log('❌ List directory failed:', error);
  }

  // Test 2: Read file
  console.log('\nTest 2: Read file');
  try {
    const response = await fetch(`${API_BASE}?operation=read&path=/home/dentaldiamondhn/diamond-link-original/components/GlobalChatBubble.tsx`, { headers: HEADERS });
    const data = await response.json();
    console.log('✅ Read file:', response.ok ? 'SUCCESS' : 'FAILED');
    if (response.ok) {
      console.log(`   File size: ${data.size} bytes`);
      console.log(`   Content preview: ${data.content?.substring(0, 100)}...`);
    } else {
      console.log('   Error:', data.error);
    }
  } catch (error) {
    console.log('❌ Read file failed:', error);
  }

  // Test 3: Write file (should work without approval in current config)
  console.log('\nTest 3: Write file');
  try {
    const testContent = '// Test file created by file access API\nexport const test = "Hello from API";';
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...HEADERS },
      body: JSON.stringify({
        path: '/home/dentaldiamondhn/diamond-link-original/test-api-write.ts',
        content: testContent,
        operation: 'write'
      })
    });
    const data = await response.json();
    console.log('✅ Write file:', response.ok ? 'SUCCESS' : 'FAILED');
    if (response.ok) {
      console.log(`   Written ${data.size} bytes`);
    } else {
      console.log('   Error:', data.error);
      if (data.requiresApproval) {
        console.log('   ⚠️  Requires approval');
      }
    }
  } catch (error) {
    console.log('❌ Write file failed:', error);
  }

  // Test 4: Delete file (should require approval in current config)
  console.log('\nTest 4: Delete file');
  try {
    const response = await fetch(`${API_BASE}?path=/home/dentaldiamondhn/diamond-link-original/test-api-write.ts`, {
      method: 'DELETE',
      headers: HEADERS
    });
    const data = await response.json();
    console.log('✅ Delete file:', response.ok ? 'SUCCESS' : 'FAILED');
    if (response.ok) {
      console.log('   File deleted successfully');
    } else {
      console.log('   Error:', data.error);
      if (data.requiresApproval) {
        console.log('   ⚠️  Requires approval (expected)');
      }
    }
  } catch (error) {
    console.log('❌ Delete file failed:', error);
  }

  // Test 5: Try to access forbidden path
  console.log('\nTest 5: Access forbidden path');
  try {
    const response = await fetch(`${API_BASE}?operation=read&path=/etc/passwd`, { headers: HEADERS });
    const data = await response.json();
    console.log('✅ Forbidden path access:', response.ok ? 'UNEXPECTED SUCCESS' : 'EXPECTED FAILURE');
    if (!response.ok) {
      console.log('   Error:', data.error);
    }
  } catch (error) {
    console.log('❌ Forbidden path test failed:', error);
  }

  // Test 6: Try to write forbidden file type
  console.log('\nTest 6: Write forbidden file type');
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...HEADERS },
      body: JSON.stringify({
        path: '/home/dentaldiamondhn/diamond-link-original/components/test.exe',
        content: 'malicious content',
        operation: 'write'
      })
    });
    const data = await response.json();
    console.log('✅ Forbidden file type:', response.ok ? 'UNEXPECTED SUCCESS' : 'EXPECTED FAILURE');
    if (!response.ok) {
      console.log('   Error:', data.error);
    }
  } catch (error) {
    console.log('❌ Forbidden file type test failed:', error);
  }

  console.log('\n📊 Test Summary:');
  console.log('   - Directory listing: Tested');
  console.log('   - File reading: Tested');
  console.log('   - File writing: Tested');
  console.log('   - File deletion: Tested (with approval check)');
  console.log('   - Path security: Tested');
  console.log('   - File type security: Tested');
}

// Run tests
testFileAccessAPI()
  .then(() => {
    console.log('\n✨ Tests completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Tests failed:', error);
    process.exit(1);
  });
