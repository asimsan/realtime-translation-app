# 🚀 Backend Deployment Guide

This guide covers deploying the translation backend service that handles OpenAI API integration securely.

## 🏗️ Architecture Overview

```
Frontend (React Native) → Backend (Node.js/Express) → OpenAI API
                      ↓
                   [API Key stored securely on backend]
                   [Rate limiting & authentication]
                   [Error handling & logging]
```

## 📋 Prerequisites

- **Node.js** 18+ 
- **OpenAI API Key** with Realtime API access
- **Domain/Server** for hosting (production)

## 🔧 Local Development Setup

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Create `backend/.env`:

```bash
cp backend/env.example backend/.env
```

Edit `backend/.env`:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-actual-openai-api-key-here

# Server Configuration
PORT=3001
NODE_ENV=development

# Security
JWT_SECRET=your-random-jwt-secret-here
CORS_ORIGIN=http://localhost:8081,exp://192.168.1.100:8081

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=debug

# WebSocket Configuration
WS_PORT=3002
WS_HEARTBEAT_INTERVAL=30000

# OpenAI Realtime Settings
REALTIME_MODEL=gpt-realtime
REALTIME_VOICE=alloy
REALTIME_SAMPLE_RATE=24000
```

### 3. Start Development Server

```bash
# Development with hot reload
npm run dev

# Or build and run
npm run build
npm start
```

The backend will be available at `http://localhost:3001`

### 4. Test Backend Health

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-21T...",
  "version": "1.0.0",
  "environment": "development"
}
```

## 🌐 Production Deployment

### Option 1: Railway

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Deploy**:
   ```bash
   cd backend
   railway login
   railway deploy
   ```

3. **Set Environment Variables**:
   ```bash
   railway variables set OPENAI_API_KEY=sk-your-key-here
   railway variables set NODE_ENV=production
   railway variables set CORS_ORIGIN=https://your-frontend-domain.com
   ```

### Option 2: Vercel

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Create `vercel.json`** in backend folder:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "dist/server.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "dist/server.js"
       }
     ]
   }
   ```

3. **Deploy**:
   ```bash
   cd backend
   npm run build
   vercel
   ```

### Option 3: Heroku

1. **Create Heroku App**:
   ```bash
   heroku create your-translation-backend
   ```

2. **Add Buildpack**:
   ```bash
   heroku buildpacks:set heroku/nodejs
   ```

3. **Set Environment Variables**:
   ```bash
   heroku config:set OPENAI_API_KEY=sk-your-key-here
   heroku config:set NODE_ENV=production
   ```

4. **Deploy**:
   ```bash
   git subtree push --prefix=backend heroku main
   ```

### Option 4: Digital Ocean App Platform

1. **Create App** via Digital Ocean console
2. **Connect GitHub** repository
3. **Set Build/Run Commands**:
   - Build: `cd backend && npm ci && npm run build`
   - Run: `cd backend && npm start`
4. **Configure Environment Variables** in the console

## 🔒 Security Configuration

### Environment Variables (Production)

```env
# OpenAI API Key (REQUIRED)
OPENAI_API_KEY=sk-your-production-api-key

# Server
PORT=3001
NODE_ENV=production

# Security
JWT_SECRET=use-a-strong-random-secret-here
CORS_ORIGIN=https://your-frontend-domain.com,https://your-app-domain.com

# Rate Limiting (adjust for production load)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Logging
LOG_LEVEL=info
```

### Security Best Practices

1. **Environment Variables**: Never commit API keys to version control
2. **CORS Configuration**: Restrict to your frontend domains only
3. **Rate Limiting**: Adjust limits based on expected usage
4. **HTTPS**: Always use HTTPS in production
5. **API Key Rotation**: Rotate OpenAI API keys regularly

## 📊 Monitoring & Logging

### Health Check Endpoints

- `GET /health` - Basic server health
- `GET /api/translation/health` - Full system health including OpenAI
- `GET /api/realtime/status` - Realtime API status

### Logging

The backend logs important events:
- API requests and responses
- OpenAI API calls and errors
- Rate limiting events
- Authentication attempts

### Production Monitoring

Consider adding:
- **Error Tracking**: Sentry, Bugsnag
- **Performance Monitoring**: New Relic, DataDog
- **Uptime Monitoring**: Pingdom, UptimeRobot

## 🔄 Frontend Configuration

Update frontend to use your backend URL:

### Development (Frontend)
```typescript
// src/utils/backendValidator.ts
export const getBackendUrl = (): string => {
  if (__DEV__) {
    return 'http://localhost:3001'; // Local development
  }
  return 'https://your-backend-domain.com'; // Production
};
```

### Environment Variables (Frontend)
Create `.env` in project root:
```env
REACT_APP_BACKEND_URL=https://your-backend-domain.com
```

## 🧪 Testing

### Backend API Testing

```bash
# Health check
curl https://your-backend-domain.com/health

# Translation API (requires session ID)
curl -X POST https://your-backend-domain.com/api/translation/text \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: test-session-123" \
  -d '{"text": "Hello world", "targetLanguage": "ne"}'

# Realtime token (requires session ID)
curl -X POST https://your-backend-domain.com/api/realtime/token \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: test-session-123"
```

### Load Testing

```bash
# Install artillery
npm install -g artillery

# Create load test config
cat > load-test.yml << EOF
config:
  target: https://your-backend-domain.com
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: Health check
    requests:
      - get:
          url: /health
EOF

# Run load test
artillery run load-test.yml
```

## 🐛 Troubleshooting

### Common Issues

1. **OpenAI API 401 Error**
   - Check API key is correct
   - Verify API key has Realtime access
   - Check account billing status

2. **CORS Errors**
   - Update `CORS_ORIGIN` environment variable
   - Include all frontend domains

3. **Rate Limiting**
   - Adjust `RATE_LIMIT_MAX_REQUESTS`
   - Implement exponential backoff in frontend

4. **Memory Issues**
   - Monitor memory usage
   - Consider implementing connection pooling
   - Add memory limits in deployment config

### Debug Mode

Set `LOG_LEVEL=debug` to see detailed logs:
```bash
LOG_LEVEL=debug npm run dev
```

### Backend Logs

Check application logs for errors:
```bash
# Railway
railway logs

# Heroku
heroku logs --tail

# Vercel
vercel logs

# Digital Ocean
doctl apps logs your-app-id
```

## 📈 Scaling Considerations

### For High Traffic

1. **Load Balancing**: Use multiple backend instances
2. **Database**: Add Redis for session management
3. **Caching**: Cache translation results
4. **CDN**: Use CDN for static assets
5. **Auto-scaling**: Configure auto-scaling based on CPU/memory

### Cost Optimization

1. **OpenAI Usage**: Monitor and optimize API calls
2. **Server Resources**: Right-size your deployment
3. **Caching**: Reduce redundant API calls
4. **Rate Limiting**: Prevent abuse

---

**🎉 Your backend is now ready to handle secure translation requests!**

The frontend will automatically connect to your backend instead of requiring users to manage API keys directly.
