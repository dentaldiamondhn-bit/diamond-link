curl -X POST "http://localhost:3000/api/groq-chat" \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello", "userId": "test_user_123", "userRole": "tech_support"}'
