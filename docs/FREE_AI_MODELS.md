# 🆓 Free AI Models Installation Guide

You have multiple free alternatives to use instead of paid Claude API. Here's how to set them up:

## ✅ **Option 1: Google Gemini (Recommended - Already Available!)**

**Status:** ✅ **Already configured in your .env file!**

**Usage:**
1. Go to: `/tech-support/claude-code`
2. Select "Gemini Pro" from the dropdown
3. Start chatting immediately!

**Limits:** 1,500 requests/day (should be plenty for development)

---

## 🦙 **Option 2: Local Models with Ollama (Completely Free)**

**Installation:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Available Models:**
- Llama 3.2 (8B) - Great for coding
- CodeLlama (7B/13B) - Specialized for code
- Mistral (7B) - Fast and efficient

**Setup Steps:**
1. Install Ollama using the command above
2. Download a model: `ollama pull llama3.2`
3. Start Ollama service: `ollama serve`
4. Select "Local Llama" in the chat interface

**Pros:**
- ✅ Completely free
- ✅ Works offline
- ✅ Private (no data leaves your device)
- ✅ No rate limits

**Cons:**
- ❌ Requires good hardware
- ❌ Slower than cloud APIs

---

## ⚡ **Option 3: Groq (Fast & Free)**

**Setup:**
1. Get API key from https://console.groq.com/
2. Add to .env: `GROQ_API_KEY=your_key_here`
3. Select "Groq Llama" in the chat interface

**Models Available:**
- Llama 3.1 70B (8192) - Fast coding model
- Mixtral 8x7B - Great for reasoning

**Limits:** 30 requests/minute (very generous!)

**Pros:**
- ✅ Very fast responses
- ✅ Good for coding tasks
- ✅ Free tier is generous

---

## 🔧 **How to Add New Models**

Want to add another free model? Here's the pattern:

1. **Create API Route:** `/app/api/[model-name]/route.ts`
2. **Add to Models List:** Add to `availableModels` array in the chat component
3. **Update .env:** Add API key placeholder
4. **Test:** Select and try the new model

---

## 📊 **Comparison Table**

| Model | Cost | Speed | Quality | Setup Difficulty |
|-------|-------|--------|-----------------|
| Gemini Pro | Free | Fast | ⭐ Easy (already setup) |
| Local Llama | Free | Slow | ⚠️ Medium (hardware needed) |
| Groq Llama | Free | Very Fast | ⭐ Easy (API key needed) |
| Claude Sonnet | Paid | Fast | ⚠️ Hard (API key needed) |

---

## 🎯 **Recommendation**

**For Development:** Start with **Gemini Pro** (already configured!)

**For Privacy:** Use **Local Llama** with Ollama

**For Speed:** Use **Groq Llama** once you get an API key

---

## 🚀 **Quick Start Commands**

```bash
# Test Gemini (should work immediately)
curl -X POST http://localhost:3000/api/gemini-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, can you help me with React?"}'

# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2
ollama serve

# Test Local Model
curl -X POST http://localhost:3000/api/local-ai \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, can you help me with React?"}'
```

Choose the option that best fits your needs and budget! 🎉
