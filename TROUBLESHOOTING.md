# 🔧 Troubleshooting Guide

This guide helps resolve common issues with the Real-Time Translation App.

## 🚨 Common Issues

### 1. API Key Validation Errors (401 Unauthorized)

**Error Message:**
```
❌ API Key validation failed: 401
"Incorrect API key provided: sk-proj-..."
```

**Possible Causes & Solutions:**

#### A. Invalid or Revoked API Key
- **Check:** Your API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Solution:** 
  1. Verify the key hasn't been revoked or expired
  2. Copy the entire key without extra spaces
  3. If using a project key, ensure the project is active

#### B. Insufficient Permissions
- **Check:** Your account/project permissions
- **Solution:**
  1. Ensure your OpenAI account has active billing
  2. Check if your organization has API access enabled
  3. For project keys, verify the project has necessary permissions

#### C. Realtime API Access Not Enabled
- **Check:** Realtime API availability
- **Solution:**
  1. Contact OpenAI support to request Realtime API access
  2. Ensure your billing tier supports Realtime features
  3. Check if Realtime is available in your region

### 2. No Realtime Access (403 Forbidden)

**Error Message:**
```
❌ Forbidden (403): API key lacks Realtime access
```

**Solutions:**
1. **Request Access:** Contact OpenAI to enable Realtime API
2. **Check Billing:** Ensure sufficient credits and active billing
3. **Verify Tier:** Confirm your plan supports Realtime features
4. **Regional Availability:** Check if Realtime is available in your region

### 3. Rate Limiting (429 Too Many Requests)

**Error Message:**
```
❌ Rate limit exceeded
```

**Solutions:**
1. **Wait:** Rate limits reset over time (usually minutes)
2. **Check Credits:** Ensure your account has available credits
3. **Upgrade Plan:** Consider upgrading your OpenAI plan
4. **Reduce Usage:** Limit validation attempts

### 4. Network Connection Issues

**Error Message:**
```
❌ Network error during validation
```

**Solutions:**
1. **Check Internet:** Verify stable internet connection
2. **Firewall:** Ensure OpenAI domains aren't blocked
3. **VPN Issues:** Try disabling VPN if active
4. **Retry:** Wait and try again

## 🔍 Diagnostic Tools

### Built-in Diagnostics

The app includes comprehensive diagnostics that will help identify issues:

```javascript
// Automatic diagnostics run on initialization
🔬 API Key Diagnostics Report
=====================================
✅ Valid Format: true
🔑 Key Type: project
🌐 Basic Access: false
⚡ Realtime Access: false
💳 Billing Status: no_credits

❌ Errors:
  1. API key is invalid or revoked

💡 Recommendations:
  1. Verify the API key at platform.openai.com/api-keys
  2. Check if the key has been revoked or expired
  3. Ensure you copied the entire key without spaces
```

### Manual Testing

You can manually test your API key:

1. **Basic Test:**
   ```bash
   curl -H "Authorization: Bearer YOUR_API_KEY" \
        https://api.openai.com/v1/models
   ```

2. **Realtime Test:**
   ```bash
   curl -X POST \
        -H "Authorization: Bearer YOUR_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"session":{"type":"realtime","model":"gpt-realtime"}}' \
        https://api.openai.com/v1/realtime/client_secrets
   ```

## 🔑 API Key Requirements

### Minimum Requirements
- ✅ Valid OpenAI API key (starts with `sk-`)
- ✅ Active billing account with credits
- ✅ API access enabled for your account/organization

### Realtime API Requirements
- ✅ Realtime API access enabled by OpenAI
- ✅ Sufficient billing tier (typically paid plans)
- ✅ Regional availability (check with OpenAI)

### Key Types

#### User Keys (`sk-...`)
- Associated with your personal OpenAI account
- Inherit all account permissions
- Good for development and personal use

#### Project Keys (`sk-proj-...`)
- Scoped to specific projects
- More granular permission control
- Recommended for production use
- **Note:** Ensure the project has Realtime access enabled

#### Service Account Keys (`sk-svcacct-...`)
- For automated systems
- More restricted permissions
- May not have Realtime access by default

## 🛠️ Step-by-Step Resolution

### For 401 Errors:

1. **Verify Key Format**
   ```javascript
   // Should start with 'sk-' and be ~50+ characters
   console.log(apiKey.substring(0, 3)); // Should log 'sk-'
   console.log(apiKey.length); // Should be ~50+ characters
   ```

2. **Test Basic Access**
   - Use the diagnostic tool in the app
   - Check console for detailed error messages
   - Verify account status at platform.openai.com

3. **Check Billing**
   - Visit [platform.openai.com/usage](https://platform.openai.com/usage)
   - Ensure active payment method
   - Check credit balance

4. **Request Realtime Access**
   - Contact OpenAI support if needed
   - Specify you need Realtime API access
   - Mention your use case (translation app)

### For Development:

1. **Use Fallback Mode**
   - App can work with basic API access
   - Uses chat completions for translation
   - Less real-time but still functional

2. **Test Environment**
   - Start with a fresh API key
   - Test in a minimal environment
   - Gradually add complexity

## 📞 Getting Help

### OpenAI Support
- **Portal:** [help.openai.com](https://help.openai.com)
- **Email:** Support tickets through the portal
- **Documentation:** [platform.openai.com/docs](https://platform.openai.com/docs)

### App-Specific Issues
- Check console logs for detailed error messages
- Review the diagnostic report output
- Ensure you're using the latest version of the app

### Community Resources
- OpenAI Community Forum
- GitHub Issues (for app-specific bugs)
- Stack Overflow (tag: openai)

## 🔄 Common Fixes

### Quick Reset
1. Clear saved API key in app settings
2. Restart the app
3. Re-enter API key carefully
4. Check diagnostics output

### Environment Reset
1. Clear browser cache (for web version)
2. Reset Expo development server
3. Restart Metro bundler
4. Clear node_modules and reinstall

### API Key Reset
1. Generate new API key at platform.openai.com
2. Delete old key if compromised
3. Update billing information if needed
4. Test new key with diagnostic tool

---

**Remember:** The Realtime API is a premium feature that requires special access. If you're getting 401 errors, start by ensuring your basic API access works, then work toward getting Realtime access enabled.
