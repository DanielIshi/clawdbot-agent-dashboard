const fs = require('fs');
const { execSync } = require('child_process');

// Paths
const AUTH_PROFILES = '/root/.clawdbot/agents/main/agent/auth-profiles.json';
const CLAWDBOT_LOG = '/var/log/clawdbot.log';

function getClawdBotStatus() {
  try {
    // 1. Auth Profile lesen
    const authData = JSON.parse(fs.readFileSync(AUTH_PROFILES, 'utf8'));
    const oauthProfile = authData.profiles['anthropic:claude-cli'];
    const apiKeyProfile = authData.profiles['anthropic:api-key-fallback'];
    const lastGood = authData.lastGood?.anthropic || 'unknown';
    
    // 2. Token-Ablauf berechnen
    const now = Date.now();
    const expires = oauthProfile.expires || 0;
    const timeRemaining = expires - now;
    const hoursRemaining = Math.floor(timeRemaining / 1000 / 3600);
    const minutesRemaining = Math.floor((timeRemaining / 1000 / 60) % 60);
    
    // 3. Rate Limit Detection (letzte 100 Zeilen)
    const logTail = execSync(`tail -100 ${CLAWDBOT_LOG}`, { encoding: 'utf8' });
    const rateLimitLines = logTail.split('\n').filter(line => 
      line.includes('rate limit') || line.includes('timed out')
    );
    const rateLimitDetected = rateLimitLines.length > 0;
    const lastRateLimitTime = rateLimitLines.length > 0 
      ? rateLimitLines[rateLimitLines.length - 1].substring(0, 24)
      : null;
    
    // 4. Letzte Fehler
    const errorLines = logTail.split('\n').filter(line => 
      line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')
    ).slice(-3);
    
    // 5. Usage Stats
    const usageStats = authData.usageStats || {};
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      auth: {
        activeProfile: lastGood,
        oauthToken: {
          exists: !!oauthProfile,
          expires: new Date(expires).toISOString(),
          hoursRemaining,
          minutesRemaining,
          isValid: timeRemaining > 0,
          needsRenewal: hoursRemaining < 4
        },
        apiKeyFallback: {
          exists: !!apiKeyProfile,
          type: apiKeyProfile?.type
        }
      },
      rateLimit: {
        detected: rateLimitDetected,
        occurrences: rateLimitLines.length,
        lastDetected: lastRateLimitTime,
        recentErrors: errorLines
      },
      usage: usageStats,
      recommendations: generateRecommendations(hoursRemaining, rateLimitDetected, lastGood)
    };
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

function generateRecommendations(hours, rateLimit, activeProfile) {
  const recs = [];
  
  if (hours < 4) {
    recs.push({
      severity: 'high',
      message: `OAuth Token läuft in ${hours}h ab - Erneuerung empfohlen`,
      action: 'Run: claude setup-token'
    });
  }
  
  if (rateLimit && activeProfile === 'anthropic:claude-cli') {
    recs.push({
      severity: 'critical',
      message: 'Rate Limit erkannt - Automatischer Fallback auf API-Key empfohlen',
      action: 'Run: /root/clawdbot-rate-limit-fallback.sh'
    });
  }
  
  if (activeProfile === 'anthropic:api-key-fallback') {
    recs.push({
      severity: 'medium',
      message: 'Aktuell auf kostenpflichtigem API-Key - Zurück auf OAuth wenn möglich',
      action: 'Wait 2h for rate limit reset, then switch back'
    });
  }
  
  return recs;
}

module.exports = { getClawdBotStatus };
