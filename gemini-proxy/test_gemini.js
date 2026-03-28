// test_gemini.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function testGemini() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY is not set in environment variables');
    return;
  }

  console.log('Testing Gemini API with key ending in:', process.env.GEMINI_API_KEY.slice(-4));
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Try with the correct model name
    const modelName = 'gemini-1.0-pro';
    console.log(`\nUsing model: ${modelName}`);
    
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const prompt = 'Say "Hello World" in an HTML div';
      
      console.log('\nSending test request to Gemini...');
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('\n✅ Success! Gemini response:');
      console.log(text);
    } catch (modelError) {
      console.error('\n❌ Error with model.generateContent():');
      console.error('Error message:', modelError.message);
      console.error('Model name used:', modelName);
      
      // Try with direct API call as fallback
      console.error('\nTrying direct API call as fallback...');
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: 'Say "Hello World" in an HTML div'
              }]
            }]
          })
        });
        
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error?.message || 'Unknown API error');
        }
        
        console.log('\n✅ Success with direct API call! Response:');
        console.log(data.candidates[0].content.parts[0].text);
      } catch (apiError) {
        console.error('\n❌ Direct API call also failed:');
        console.error(apiError.message);
        console.error('\nPlease check your API key and ensure it has access to the Gemini API.');
        console.error('You may need to enable the API in Google Cloud Console:');
        console.error('https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error testing Gemini API:');
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.status, error.response.statusText);
    }
    console.error('\nFull error object:', JSON.stringify(error, null, 2));
  }
}

testGemini();