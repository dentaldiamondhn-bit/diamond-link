#!/bin/bash

# Cloudflare DNS Setup Verification Script
# Run this script to verify your Cloudflare configuration

echo "🔍 Cloudflare DNS Setup Verification for Diamond Link"
echo "=================================================="

# Configuration - Update these values
DOMAIN="dentaldiamondhn.com"  # Replace with your actual domain
VERCEL_DOMAIN="diamond-link.vercel.app"

echo "📋 Checking DNS configuration for: $DOMAIN"
echo ""

# Function to check DNS record
check_dns() {
    local record_type=$1
    local record_name=$2
    local expected_value=$3
    
    echo "🔍 Checking $record_type record for $record_name..."
    
    if command -v dig >/dev/null 2>&1; then
        result=$(dig +short $record_type $record_name)
    elif command -v nslookup >/dev/null 2>&1; then
        result=$(nslookup -type=$record_type $record_name | grep -A1 "Name:" | tail -1 | awk '{print $2}')
    else
        echo "❌ Neither dig nor nslookup found. Please install one of them."
        return 1
    fi
    
    if [ -n "$result" ]; then
        echo "✅ $record_type record found: $result"
        if [ -n "$expected_value" ]; then
            if [[ "$result" == *"$expected_value"* ]]; then
                echo "✅ Matches expected value"
            else
                echo "⚠️  Expected: $expected_value"
            fi
        fi
    else
        echo "❌ No $record_type record found"
    fi
    echo ""
}

# Check A record
check_dns "A" "$DOMAIN" "76.76.21.21"

# Check CNAME record for www
check_dns "CNAME" "www.$DOMAIN" "$VERCEL_DOMAIN"

# Check MX records (email)
echo "🔍 Checking MX records for $DOMAIN..."
if command -v dig >/dev/null 2>&1; then
    mx_records=$(dig +short MX $DOMAIN)
    if [ -n "$mx_records" ]; then
        echo "✅ MX records found:"
        echo "$mx_records"
    else
        echo "⚠️  No MX records found (OK if not using email)"
    fi
else
    echo "⚠️  Cannot check MX records without dig"
fi
echo ""

# Check TXT records
echo "🔍 Checking TXT records for $DOMAIN..."
if command -v dig >/dev/null 2>&1; then
    txt_records=$(dig +short TXT $DOMAIN)
    if [ -n "$txt_records" ]; then
        echo "✅ TXT records found:"
        echo "$txt_records"
    else
        echo "⚠️  No TXT records found"
    fi
else
    echo "⚠️  Cannot check TXT records without dig"
fi
echo ""

# Check nameservers
echo "🔍 Checking nameservers for $DOMAIN..."
if command -v dig >/dev/null 2>&1; then
    ns_records=$(dig +short NS $DOMAIN)
    if [ -n "$ns_records" ]; then
        echo "✅ Nameservers found:"
        echo "$ns_records"
        
        # Check if using Cloudflare nameservers
        if [[ "$ns_records" == *"cloudflare"* ]]; then
            echo "✅ Using Cloudflare nameservers"
        else
            echo "⚠️  Not using Cloudflare nameservers"
        fi
    else
        echo "❌ No nameservers found"
    fi
else
    echo "⚠️  Cannot check nameservers without dig"
fi
echo ""

# SSL Certificate Check
echo "🔒 Checking SSL certificate for $DOMAIN..."
if command -v openssl >/dev/null 2>&1; then
    echo "Q" | openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep "notAfter" || echo "❌ Could not retrieve SSL certificate"
else
    echo "⚠️  Cannot check SSL certificate without openssl"
fi
echo ""

# HTTP Headers Check
echo "🔒 Checking security headers for $DOMAIN..."
if command -v curl >/dev/null 2>&1; then
    echo "Checking HTTP headers..."
    curl -s -I "https://$DOMAIN" | grep -E "(X-Frame-Options|X-Content-Type-Options|X-XSS-Protection|Strict-Transport-Security)" || echo "⚠️  Some security headers may be missing"
else
    echo "⚠️  Cannot check HTTP headers without curl"
fi
echo ""

# Cloudflare-specific checks
echo "☁️  Cloudflare-specific checks"
echo "================================"

# Check if Cloudflare is proxying
if command -v curl >/dev/null 2>&1; then
    cf_ray=$(curl -s -I "https://$DOMAIN" | grep -i "cf-ray" || echo "")
    if [ -n "$cf_ray" ]; then
        echo "✅ Cloudflare proxy is active (CF-RAY header found)"
    else
        echo "⚠️  Cloudflare proxy may not be active"
    fi
    
    # Check Cloudflare server header
    cf_server=$(curl -s -I "https://$DOMAIN" | grep -i "server: cloudflare" || echo "")
    if [ -n "$cf_server" ]; then
        echo "✅ Cloudflare server header found"
    else
        echo "⚠️  Cloudflare server header not found"
    fi
fi
echo ""

echo "📊 Performance Tests"
echo "=================="

# Basic response time test
if command -v curl >/dev/null 2>&1; then
    echo "Testing response time..."
    start_time=$(date +%s%N)
    curl -s "https://$DOMAIN" > /dev/null
    end_time=$(date +%s%N)
    response_time=$(( (end_time - start_time) / 1000000 ))
    echo "✅ Response time: ${response_time}ms"
    
    if [ $response_time -lt 500 ]; then
        echo "✅ Good response time (< 500ms)"
    elif [ $response_time -lt 1000 ]; then
        echo "⚠️  Moderate response time (500-1000ms)"
    else
        echo "❌ Slow response time (> 1000ms)"
    fi
fi
echo ""

echo "🔧 Recommendations"
echo "================"
echo "1. Ensure all DNS records point to Cloudflare"
echo "2. Enable 'Full (strict)' SSL/TLS mode in Cloudflare"
echo "3. Set up security headers in Cloudflare Transform Rules"
echo "4. Configure rate limiting for API endpoints"
echo "5. Enable Brotli compression and auto-minification"
echo "6. Set up Cloudflare Analytics for monitoring"
echo "7. Consider Cloudflare Workers for additional security"
echo ""

echo "✅ Verification complete!"
echo "📚 For detailed setup instructions, see: docs/cloudflare-dns-setup.md"
