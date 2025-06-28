/**
 * Pre-Boot Health Checks
 * Validates critical dependencies before application startup
 */

const Redis = require('ioredis');
const { Client } = require('pg');

/**
 * Check database connectivity
 */
async function checkDatabase() {
  const checks = {
    name: 'Database',
    status: 'unknown',
    details: {},
    errors: []
  };

  try {
    const dbClient = process.env.DATABASE_CLIENT || 'postgres';
    
    if (dbClient === 'postgres') {
      // Check PostgreSQL connection
      if (!process.env.DATABASE_URL && (!process.env.DATABASE_HOST || !process.env.DATABASE_NAME)) {
        throw new Error('PostgreSQL configuration missing: DATABASE_URL or DATABASE_HOST/DATABASE_NAME required');
      }
      
      const client = new Client({
        connectionString: process.env.DATABASE_URL,
        host: process.env.DATABASE_HOST,
        port: process.env.DATABASE_PORT,
        database: process.env.DATABASE_NAME,
        user: process.env.DATABASE_USERNAME,
        password: process.env.DATABASE_PASSWORD,
      });

      await client.connect();
      const result = await client.query('SELECT NOW()');
      await client.end();

      checks.status = 'healthy';
      checks.details = {
        client: 'PostgreSQL',
        connection: 'successful',
        timestamp: result.rows[0].now
      };
    } else if (dbClient === 'sqlite') {
      // SQLite is file-based, just check if path is accessible
      const fs = require('fs');
      const path = require('path');
      
      const dbPath = process.env.DATABASE_FILENAME || '.tmp/data.db';
      const fullPath = path.resolve(dbPath);
      const dirPath = path.dirname(fullPath);
      
      // Ensure directory exists
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // Test SQLite access by trying to create a test file
      const testFile = path.join(dirPath, '.health-check-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      
      checks.status = 'healthy';
      checks.details = {
        client: 'SQLite',
        path: fullPath,
        directory: dirPath,
        writable: true
      };
    }

  } catch (error) {
    checks.status = 'unhealthy';
    checks.errors.push(error.message);
    checks.details.error = error.code || 'UNKNOWN';
  }

  return checks;
}

/**
 * Check Redis connectivity (optional)
 */
async function checkRedis() {
  const checks = {
    name: 'Redis',
    status: 'unknown',
    details: {},
    errors: []
  };

  try {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl || redisUrl === 'redis://user:password@host:port') {
      // Redis not configured - this is OK
      checks.status = 'not_configured';
      checks.details.message = 'Redis not configured - using in-memory fallback';
      return checks;
    }

    const redis = new Redis(redisUrl, {
      connectTimeout: 5000,
      lazyConnect: true,
      maxRetriesPerRequest: 1
    });

    await redis.connect();
    await redis.ping();
    await redis.disconnect();

    checks.status = 'healthy';
    checks.details = {
      connection: 'successful',
      url: redisUrl.replace(/:[^:@]*@/, ':***@') // Hide password
    };

  } catch (error) {
    checks.status = 'unhealthy';
    checks.errors.push(error.message);
    checks.details = {
      fallback: 'Will use in-memory queues',
      error: error.code || 'UNKNOWN'
    };
  }

  return checks;
}

/**
 * Check AI provider API keys
 */
async function checkAIProviders() {
  const checks = {
    name: 'AI Providers',
    status: 'unknown',
    details: {},
    errors: []
  };

  const providers = {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    google: process.env.GOOGLE_API_KEY
  };

  const results = {};
  let hasValidProvider = false;

  for (const [provider, apiKey] of Object.entries(providers)) {
    if (apiKey && apiKey.length > 10 && !apiKey.includes('your-api-key')) {
      results[provider] = 'configured';
      hasValidProvider = true;
    } else {
      results[provider] = 'not_configured';
    }
  }

  checks.details = results;

  if (hasValidProvider) {
    checks.status = 'healthy';
    checks.details.message = `${Object.values(results).filter(v => v === 'configured').length} provider(s) configured`;
  } else {
    checks.status = 'unhealthy';
    checks.errors.push('No AI providers configured with valid API keys');
  }

  return checks;
}

/**
 * Check Google Service Account credentials
 */
async function checkGoogleCredentials() {
  const checks = {
    name: 'Google Credentials',
    status: 'unknown',
    details: {},
    errors: []
  };

  try {
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!serviceAccountEmail || !privateKey) {
      checks.status = 'not_configured';
      checks.details.message = 'Google Sheets integration not configured (optional)';
      return checks;
    }

    // Basic validation of credentials format
    if (!serviceAccountEmail.includes('@') || !privateKey.includes('BEGIN PRIVATE KEY')) {
      checks.status = 'unhealthy';
      checks.errors.push('Invalid Google Service Account credentials format');
      return checks;
    }

    checks.status = 'healthy';
    checks.details = {
      serviceAccount: serviceAccountEmail,
      privateKeyLength: privateKey.length,
      message: 'Google Sheets integration ready'
    };

  } catch (error) {
    checks.status = 'unhealthy';
    checks.errors.push(error.message);
  }

  return checks;
}

/**
 * Check SMTP email configuration
 */
async function checkEmailConfig() {
  const checks = {
    name: 'Email Configuration',
    status: 'unknown',
    details: {},
    errors: []
  };

  try {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      checks.status = 'not_configured';
      checks.details.message = 'SMTP not configured - email features disabled';
      return checks;
    }

    checks.status = 'healthy';
    checks.details = {
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      message: 'SMTP configuration found'
    };

  } catch (error) {
    checks.status = 'unhealthy';
    checks.errors.push(error.message);
  }

  return checks;
}

/**
 * Run all health checks
 */
async function runHealthChecks() {
  const startTime = Date.now();
  
  console.log('🏥 Running pre-boot health checks...\n');

  const checks = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkAIProviders(),
    checkGoogleCredentials(),
    checkEmailConfig()
  ]);

  const duration = Date.now() - startTime;
  const summary = {
    total: checks.length,
    healthy: checks.filter(c => c.status === 'healthy').length,
    unhealthy: checks.filter(c => c.status === 'unhealthy').length,
    not_configured: checks.filter(c => c.status === 'not_configured').length,
    duration
  };

  // Display results
  checks.forEach(check => {
    const statusIcon = {
      healthy: '✅',
      unhealthy: '❌',
      not_configured: '⚠️',
      unknown: '❓'
    }[check.status] || '❓';

    console.log(`${statusIcon} ${check.name}: ${check.status.toUpperCase()}`);
    
    if (check.details.message) {
      console.log(`   ${check.details.message}`);
    }
    
    if (check.errors.length > 0) {
      check.errors.forEach(error => {
        console.log(`   Error: ${error}`);
      });
    }
    console.log('');
  });

  // Summary
  console.log(`📊 Health Check Summary:`);
  console.log(`   ✅ Healthy: ${summary.healthy}`);
  console.log(`   ❌ Unhealthy: ${summary.unhealthy}`);
  console.log(`   ⚠️  Not Configured: ${summary.not_configured}`);
  console.log(`   ⏱️  Duration: ${duration}ms\n`);

  // Determine if we should continue startup
  const criticalChecks = checks.filter(c => c.name === 'Database' || c.name === 'AI Providers');
  const criticalFailures = criticalChecks.filter(c => c.status === 'unhealthy');

  if (criticalFailures.length > 0) {
    console.log('💥 CRITICAL: Cannot start application due to failed health checks:');
    criticalFailures.forEach(check => {
      console.log(`   - ${check.name}: ${check.errors.join(', ')}`);
    });
    console.log('\nPlease fix the above issues and restart the application.\n');
    return false;
  }

  console.log('🎉 Health checks passed! Application can start safely.\n');
  return true;
}

module.exports = {
  runHealthChecks,
  checkDatabase,
  checkRedis,
  checkAIProviders,
  checkGoogleCredentials,
  checkEmailConfig
};