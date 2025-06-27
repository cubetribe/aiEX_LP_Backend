# 📧 Email Service Setup Guide

## Quick Setup für GoAIX Email System

### 1. Gmail Setup (Empfohlen für Testing)

**Railway Environment Variables:**
```bash
EMAIL_PROVIDER=gmail
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcd-efgh-ijkl-mnop
EMAIL_FROM=your-email@gmail.com
```

**Gmail App Password erstellen:**
1. Gehe zu [Google Account Settings](https://myaccount.google.com/security)
2. Aktiviere 2-Step Verification
3. Gehe zu "App passwords"
4. Erstelle neues App Password für "GoAIX"
5. Verwende das generierte 16-stellige Passwort

### 2. SMTP Setup (Universal)

**Railway Environment Variables:**
```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@your-domain.com
SMTP_PASS=your-password
EMAIL_FROM=your-email@your-domain.com
```

### 3. SendGrid Setup (Production)

**Railway Environment Variables:**
```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@goaiex.com
```

### 4. Testing ohne Email (Development)

**Railway Environment Variables:**
```bash
EMAIL_PROVIDER=none
```
→ Emails werden nicht versendet, aber das System funktioniert

## Schnelltest

Nach dem Setup teste die Email-Funktion:

```bash
# Test Email Service Status
curl https://web-production-6df54.up.railway.app/ai/status

# Submit Test Lead (sollte Email auslösen)
curl -X POST https://web-production-6df54.up.railway.app/campaigns/test-quiz/submit \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "email": "test@example.com", 
    "responses": {"test": "value"}
  }'
```

## Railway Environment Variables

**Minimal Setup (Gmail):**
1. Railway Dashboard → Variables
2. Füge hinzu:
   ```
   EMAIL_PROVIDER=gmail
   GMAIL_USER=deine-email@gmail.com
   GMAIL_APP_PASSWORD=dein-app-passwort
   EMAIL_FROM=deine-email@gmail.com
   ```
3. Service redeploys automatisch

**Production Setup (SendGrid):**
```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.dein-api-key
EMAIL_FROM=noreply@goaiex.com
```

## Troubleshooting

### Email wird nicht versendet:
1. ✅ Environment Variables korrekt gesetzt?
2. ✅ Gmail App Password (nicht normales Passwort)?
3. ✅ Railway Service neu gestarted nach Variable-Änderung?
4. ✅ `EMAIL_PROVIDER` explizit gesetzt?

### Error "Email service not configured":
- Setze `EMAIL_PROVIDER=none` für Development ohne Emails
- Oder konfiguriere einen der Provider oben

### Gmail "Authentication failed":
- Verwende App Password, nicht das normale Passwort
- 2-Step Verification muss aktiviert sein

---

**Nach dem Setup:** Das Email-System versendet automatisch personalisierte AI-Ergebnisse an jeden Lead! 📧✨