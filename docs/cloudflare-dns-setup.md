# Cloudflare DNS Protection Setup Guide

## Overview
This guide will help you set up Cloudflare DNS protection for your Diamond Link application deployed on Vercel.

## Prerequisites
- Cloudflare account (free tier is sufficient)
- Access to your domain registrar
- Vercel project already deployed

## Step 1: Add Your Domain to Cloudflare

1. **Sign in to Cloudflare** at https://dash.cloudflare.com
2. **Add a site**: Click "+ Add a site"
3. **Enter your domain**: `your-domain.com` (replace with your actual domain)
4. **Select Free plan** and continue
5. **Verify domain ownership**:
   - If your domain is already registered, Cloudflare will scan existing DNS records
   - If not, follow the verification steps

## Step 2: Update Nameservers

1. **Cloudflare will provide nameservers** like:
   - `anna.ns.cloudflare.com`
   - `bob.ns.cloudflare.com`

2. **Update nameservers at your domain registrar**:
   - Go to your domain registrar (GoDaddy, Namecheap, etc.)
   - Replace existing nameservers with Cloudflare's nameservers
   - Save changes (may take 24-48 hours to propagate)

## Step 3: Configure DNS Records

1. **In Cloudflare DNS settings**, add these records:

### A Record (Root Domain)
```
Type: A
Name: @ (or your-domain.com)
IPv4 address: 76.76.21.21 (Vercel's IP)
Proxy status: Proxied (orange cloud)
TTL: Auto
```

### CNAME Record (www)
```
Type: CNAME
Name: www
Target: your-domain.vercel.app
Proxy status: Proxied (orange cloud)
TTL: Auto
```

### TXT Records (Optional - for verification)
```
Type: TXT
Name: @
Content: v=spf1 include:_spf.vercel-ip.com ~all
```

## Step 4: Configure SSL/TLS

1. **Go to SSL/TLS** in Cloudflare dashboard
2. **Set encryption mode**: Full (strict)
3. **Enable HTTPS redirects**: On
4. **Set HSTS**: Enable with max-age of 6 months

## Step 5: Security Settings

### DDoS Protection
- Go to **Security** → **DDoS Protection**
- Enable **DDoS Protection** (included in free plan)

### Web Application Firewall (WAF)
- Go to **Security** → **WAF**
- Enable **Cloudflare WAF** (free tier includes basic rules)
- Add custom rules if needed

### Rate Limiting
- Go to **Security** → **Rate Limiting**
- Create rate limiting rules:
  ```
  Rule: API Protection
  Path: /api/*
  Rate limit: 100 requests per minute
  Action: Challenge
  ```

## Step 6: Performance Optimization

### Caching Settings
- Go to **Caching** → **Configuration**
- Set **Cache Level**: Standard
- Enable **Browser Cache TTL**: 4 hours
- Enable **Always Online**: On

### Brotli Compression
- Go to **Speed** → **Optimization**
- Enable **Brotli**: On

## Step 7: Update Vercel Custom Domain

1. **Go to Vercel dashboard**
2. **Select your project**
3. **Go to Settings** → **Domains**
4. **Add custom domain**: `your-domain.com`
5. **Verify DNS configuration** (should show green checkmark)

## Step 8: Environment Variables for Cloudflare

Add these to your `.env.local` file:

```env
# Cloudflare Headers
NEXT_PUBLIC_CLOUDFLARE_ANALYTICS=true
NEXT_PUBLIC_FORCE_HTTPS=true

# Security Headers
NEXT_PUBLIC_SECURITY_HEADERS=true
```

## Step 9: Test Configuration

1. **DNS Propagation Check**:
   ```bash
   nslookup your-domain.com
   dig your-domain.com
   ```

2. **SSL Certificate Check**:
   - Visit https://www.ssllabs.com/ssltest/
   - Enter your domain and check certificate

3. **Security Headers Check**:
   - Visit https://securityheaders.com/
   - Enter your domain and analyze

## Step 10: Monitor and Maintain

### Cloudflare Analytics
- Monitor traffic patterns
- Check for unusual activity
- Review blocked requests

### Regular Updates
- Keep SSL certificates renewed
- Update security rules as needed
- Monitor DNS health

## Troubleshooting

### Common Issues

**DNS Not Propagating**
- Wait 24-48 hours for full propagation
- Check nameservers at registrar
- Use DNS propagation checkers

**SSL Certificate Issues**
- Verify encryption mode is "Full (strict)"
- Check origin server certificate
- Disable Universal SSL temporarily if needed

**API Requests Blocked**
- Review WAF rules
- Add exceptions for legitimate traffic
- Adjust rate limiting thresholds

### Emergency Rollback
If issues occur:
1. **Disable Cloudflare proxy** (gray cloud)
2. **Revert to original nameservers**
3. **Contact support** if needed

## Additional Security Measures

### Cloudflare Workers (Optional)
```javascript
// Basic security worker example
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Block suspicious user agents
  const userAgent = request.headers.get('user-agent')
  if (userAgent && userAgent.includes('bot')) {
    return new Response('Blocked', { status: 403 })
  }
  
  return fetch(request)
}
```

### Page Rules (Free Plan)
```
Rule 1: Always use HTTPS
Pattern: http://*your-domain.com/*
Settings: Always Use HTTPS (ON)

Rule 2: Cache API responses
Pattern: your-domain.com/api/*
Settings: Cache Level: Everything, Edge Cache TTL: 2 hours
```

## Support Resources

- Cloudflare Documentation: https://developers.cloudflare.com/
- Vercel Custom Domains: https://vercel.com/docs/custom-domains
- Community Support: https://community.cloudflare.com/

## Next Steps

After setup is complete:
1. Monitor performance improvements
2. Review security logs regularly
3. Optimize caching rules based on usage patterns
4. Consider upgrading to Pro plan for advanced features

---

**Note**: This configuration provides enterprise-grade security and performance for your Diamond Link application while maintaining full compatibility with Vercel's infrastructure.
