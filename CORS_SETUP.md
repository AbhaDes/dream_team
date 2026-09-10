# CORS Configuration

## Overview
This document explains the CORS (Cross-Origin Resource Sharing) setup for Dream-Team's backend server.

## Allowed Origins

The server allows requests from the following origins:

1. **Local Development**: `http://localhost:3000`
   - Used for local development testing against deployed backend

2. **Production**: `https://dream-team-nine.vercel.app`
   - Main production deployment

3. **Environment Variable**: Any origin specified in `FRONTEND_URL` env var
   - Allows flexibility for custom deployments

4. **Vercel Preview Deployments**: `https://*.vercel.app`
   - Regex pattern: `^https:\/\/[a-z0-9-]+\.vercel\.app$`
   - Enables testing on Vercel preview deployment URLs
   - This is particularly useful for testing PR branches and feature deployments

## Implementation Details

The CORS configuration uses a custom origin checker function that:
- Allows requests with no origin (mobile apps, curl, etc.)
- Checks exact matches against the allowedOrigins array
- Uses regex pattern matching to support Vercel preview URLs
- Rejects origins not in the whitelist

## Security Considerations

- Credentials are enabled (`credentials: true`), so cookies are sent with requests
- All origins go through validation before being allowed
- The regex pattern for Vercel previews only allows `*.vercel.app` domains in HTTPS
- Subdomains in the Vercel pattern must contain only lowercase letters, numbers, and hyphens

## Testing Vercel Previews

When testing on Vercel preview deployments:
1. Deploy your branch to Vercel
2. Note the preview URL (e.g., `https://dream-team-pr-123.vercel.app`)
3. The backend will automatically allow CORS requests from this URL
4. No code changes needed for each preview

## Adding More Origins

To add additional allowed origins:
1. For permanent origins: Add to the `allowedOrigins` array in `app.js`
2. For dynamic origins: Set the `FRONTEND_URL` environment variable
3. For testing patterns: Update the regex in the origin checker function
