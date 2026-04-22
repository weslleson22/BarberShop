# Vercel Environment Variables Setup Guide

## 🚨 **CRITICAL: DATABASE_URL Configuration Required**

### 📋 **Problem Analysis**
The Vercel build is failing because `DATABASE_URL` is undefined during the build process. This causes PrismaClient constructor validation to fail.

### 🔧 **Solution: Configure Environment Variables in Vercel**

#### **1. Access Vercel Dashboard**
- Go to: https://vercel.com/dashboard
- Select your project: `BarberShop`
- Go to **Settings** → **Environment Variables**

#### **2. Add Required Environment Variables**

**🔑 DATABASE_URL (Most Critical)**
```
Key: DATABASE_URL
Value: prisma+postgres://prisma:x3M6yvJ2d3V4m8QpJ@aws-0-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1
Environment: Production, Preview, Development
```

**🔐 JWT_SECRET**
```
Key: JWT_SECRET
Value: your-super-secret-jwt-key-change-this-in-production-2024
Environment: Production, Preview, Development
```

**🔐 NEXTAUTH_SECRET**
```
Key: NEXTAUTH_SECRET
Value: your-nextauth-secret-key-change-this-in-production-2024
Environment: Production, Preview, Development
```

**🌐 NEXTAUTH_URL**
```
Key: NEXTAUTH_URL
Value: https://your-app-domain.vercel.app
Environment: Production, Preview, Development
```

**⚙️ NODE_ENV**
```
Key: NODE_ENV
Value: production
Environment: Production (only)
```

### 🚀 **Deployment Steps**

#### **1. Commit and Push Changes**
```bash
git add .
git commit -m "Fix Prisma DATABASE_URL validation for Vercel deployment"
git push origin main
```

#### **2. Configure Vercel Environment**
1. Go to Vercel Dashboard
2. Add all environment variables above
3. Save changes
4. Trigger new deployment

#### **3. Verify Deployment**
- Check build logs for success
- Test application functionality
- Verify database connection in Environment Debug

### 🔍 **Troubleshooting**

#### **If Build Still Fails:**
1. **Check Environment Variables**: Ensure all are set correctly
2. **Verify DATABASE_URL**: Must be exact string from above
3. **Check Prisma Schema**: Ensure `datasource db` uses `env("DATABASE_URL")`

#### **If Runtime Errors:**
1. **Database Connection**: Test `/api/health` endpoint
2. **Environment Debug**: Check `/api/debug/env` for variables
3. **Logs**: Review Vercel function logs

### 📊 **Expected Results**

#### **✅ Successful Build:**
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

#### **✅ Working Application:**
- Environment variables visible in debug
- Database connection successful
- All API routes functional
- Authentication working

### 🎯 **Critical Notes**

#### **DATABASE_URL Format:**
- Must use `prisma+postgres://` protocol for Prisma Data Proxy
- Include `pgbouncer=true&connection_limit=1` for serverless
- Copy EXACT string from above

#### **Environment Specifics:**
- **Production**: Use production values
- **Preview**: Same as production for testing
- **Development**: Can use local values

#### **Security:**
- Never expose secrets in client-side code
- Use different secrets for production
- Rotate secrets regularly

### 📞 **Support**

If issues persist:
1. Check Vercel function logs
2. Verify environment variable names (case-sensitive)
3. Test DATABASE_URL connection locally
4. Contact support with build logs

---

**This configuration should resolve the PrismaClient constructor error and enable successful Vercel deployment.**
