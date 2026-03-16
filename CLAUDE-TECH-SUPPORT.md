# Claude Code Tech Support Integration

## 🤖 Overview

This integration provides specialized AI assistance for the Diamond Link dental clinic management system using Claude Code CLI.

## 🚀 Quick Start

### 1. Interactive Tech Support Session
```bash
./claude-tech-support.sh
```

### 2. Get Help for Specific Issues
```bash
./claude-tech-support.sh "calendar notifications not working for invitees"
./claude-tech-support.sh "mobile browser compatibility issues"
./claude-tech-support.sh "real-time database sync problems"
```

### 3. Direct Claude Code Usage
```bash
# Use tech-support agent
claude-code --settings claude-config.json --agent tech-support --continue

# Use code reviewer agent
claude-code --settings claude-config.json --agent code-reviewer --print "Review calendar component"

# Use debugger agent
claude-code --settings claude-config.json --agent debugger --print "Debug notification flow"
```

## 🛠 Available Agents

### **tech-support** (Default)
- **Purpose:** General technical support for Diamond Link
- **Specializes:** React, Next.js, Supabase, Clerk, Calendar systems
- **Use Case:** Daily technical issues, feature development, troubleshooting

### **code-reviewer**
- **Purpose:** Code quality and security reviews
- **Specializes:** React best practices, TypeScript, security, performance
- **Use Case:** Code reviews, security audits, performance optimization

### **debugger**
- **Purpose:** Complex issue debugging
- **Specializes:** Systematic problem-solving, root cause analysis
- **Use Case:** Hard-to-reproduce bugs, performance issues, integration problems

## 📋 Common Tech Support Scenarios

### **Calendar & Notification Issues**
```bash
./claude-tech-support.sh "invitee calendar notifications not working"
./claude-tech-support.sh "android tray notifications missing"
./claude-tech-support.sh "real-time sync problems"
```

### **Mobile & PWA Issues**
```bash
./claude-tech-support.sh "mobile browser compatibility"
./claude-tech-support.sh "PWA notification permissions"
./claude-tech-support.sh "Capacitor build issues"
```

### **Database & API Issues**
```bash
./claude-tech-support.sh "Supabase query optimization"
./claude-tech-support.sh "patient data sync problems"
./claude-tech-support.sh "API integration failures"
```

### **Authentication & Security**
```bash
./claude-tech-support.sh "Clerk authentication issues"
./claude-tech-support.sh "user role management"
./claude-tech-support.sh "HIPAA compliance review"
```

## 🔧 Configuration

### **claude-config.json**
The configuration file includes:

- **Custom agents** specialized for dental clinic workflows
- **Tool permissions** tailored for tech-support tasks
- **Debug settings** for API and hooks monitoring
- **Security considerations** for patient data handling

### **Customize Your Agents**
Edit `claude-config.json` to add specialized prompts:

```json
{
  "agents": {
    "your-custom-agent": {
      "description": "Agent description",
      "prompt": "Your specialized prompt...",
      "tools": "default"
    }
  }
}
```

## 📱 IDE Integration

### **VS Code Integration**
```bash
# Start with VS Code integration
claude-code --settings claude-config.json --agent tech-support --ide --continue
```

### **Chrome DevTools Integration**
```bash
# Enable Chrome integration
claude-code --settings claude-config.json --chrome --agent tech-support
```

## 🔍 Debugging Features

### **API Debug Mode**
```bash
# Debug API calls and hooks
claude-code --settings claude-config.json --debug api,hooks --agent debugger
```

### **Performance Monitoring**
```bash
# Monitor performance issues
claude-code --settings claude-config.json --agent tech-support --print "Analyze calendar performance"
```

## 🚨 Advanced Usage

### **Session Management**
```bash
# Continue previous session
claude-code --settings claude-config.json --continue --agent tech-support

# Start fresh session
claude-code --settings claude-config.json --agent tech-support
```

### **Multi-Agent Workflows**
```bash
# 1. Debug with debugger agent
./claude-tech-support.sh "Debug notification system"

# 2. Review with code-reviewer agent
claude-code --settings claude-config.json --agent code-reviewer --print "Review notification fixes"

# 3. Implement with tech-support agent
./claude-tech-support.sh "Implement optimized notification system"
```

## 📊 Best Practices

### **For Tech Support Role:**
1. **Always use the tech-support agent** for Diamond Link issues
2. **Provide context** about dental clinic workflows
3. **Consider HIPAA compliance** for patient data
4. **Test mobile compatibility** for all solutions
5. **Document solutions** for future reference

### **Security Considerations:**
- Never expose patient data in prompts
- Use debug mode only in development
- Follow principle of least privilege
- Validate all inputs and outputs

## 🆘 Troubleshooting

### **Claude Code Not Working:**
```bash
# Check installation
which claude-code

# Reinstall if needed
npm install -g @anthropic-ai/claude-code

# Verify installation
claude-code --version
```

### **Configuration Issues:**
```bash
# Validate config file
claude-code --settings claude-config.json --agent tech-support --debug config

# Test with minimal config
claude-code --agent tech-support --print "test"
```

## 📞 Getting Help

### **Built-in Help:**
```bash
claude-code --help
./claude-tech-support.sh --help
```

### **Agent-Specific Help:**
Each agent provides specialized help based on their role and expertise.

---

**🎯 This setup transforms your tech-support workflow with AI-powered assistance specialized for dental clinic management systems!**
