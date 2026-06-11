const Redis = require('ioredis');

const FOLLOWUP_KEY_PREFIX = 'wa:followup:';
const LOCK_KEY_PREFIX = 'wa:followup:lock:';
const FOLLOWUP_TTL_SECONDS = 26 * 60 * 60;
const LOCK_TTL_SECONDS = 60;
const FOLLOWUP_WINDOW_MINUTES = 10;

class FollowupRedisState {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  static buildKey(sessionId) {
    return `${FOLLOWUP_KEY_PREFIX}${sessionId}`;
  }

  static buildLockKey(sessionId) {
    return `${LOCK_KEY_PREFIX}${sessionId}`;
  }

  async markOutbound(sessionId, phone, botMessageId, workflowId) {
    const key = FollowupRedisState.buildKey(sessionId);
    const now = Date.now();
    const eligibleAt = now + FOLLOWUP_WINDOW_MINUTES * 60 * 1000;

    const pipeline = this.redis.pipeline();
    pipeline.hset(key, {
      sessionId,
      phone,
      lastInboundAt: '0',
      lastBotOutboundAt: String(now),
      followupEligibleAt: String(eligibleAt),
      followupSentAt: '0',
      lastBotMessageId: botMessageId || '',
      lastInboundMessageId: '',
      status: 'pending',
      sourceWorkflowId: workflowId || ''
    });
    pipeline.expire(key, FOLLOWUP_TTL_SECONDS);
    await pipeline.exec();
  }

  async cancelFollowup(sessionId, reason) {
    const key = FollowupRedisState.buildKey(sessionId);
    const exists = await this.redis.exists(key);
    if (!exists) return false;

    const current = await this.redis.hgetall(key);
    if (current.followupSentAt && current.followupSentAt !== '0') {
      return false;
    }

    await this.redis.hset(key, 'status', 'cancelled');
    return true;
  }

  async markInbound(sessionId, inboundMessageId) {
    const key = FollowupRedisState.buildKey(sessionId);
    const exists = await this.redis.exists(key);
    if (!exists) return { eligible: false, reason: 'no_followup_state' };

    const now = Date.now();
    await this.redis.hset(key, {
      lastInboundAt: String(now),
      lastInboundMessageId: inboundMessageId || ''
    });

    const state = await this.redis.hgetall(key);
    const lastBotOutboundAt = parseInt(state.lastBotOutboundAt, 10) || 0;
    const lastInboundAt = parseInt(state.lastInboundAt, 10) || 0;

    if (lastInboundAt > lastBotOutboundAt) {
      await this.redis.hset(key, 'status', 'cancelled');
      return { eligible: false, reason: 'user_replied_after_bot' };
    }

    return { eligible: true };
  }

  async acquireLock(sessionId) {
    const lockKey = FollowupRedisState.buildLockKey(sessionId);
    const acquired = await this.redis.set(lockKey, '1', 'NX', 'EX', LOCK_TTL_SECONDS);
    return acquired === 'OK';
  }

  async releaseLock(sessionId) {
    const lockKey = FollowupRedisState.buildLockKey(sessionId);
    await this.redis.del(lockKey);
  }

  async getFollowupState(sessionId) {
    const key = FollowupRedisState.buildKey(sessionId);
    const state = await this.redis.hgetall(key);

    if (!state || !state.sessionId) {
      return null;
    }

    return {
      sessionId: state.sessionId,
      phone: state.phone,
      lastInboundAt: parseInt(state.lastInboundAt, 10) || 0,
      lastBotOutboundAt: parseInt(state.lastBotOutboundAt, 10) || 0,
      followupEligibleAt: parseInt(state.followupEligibleAt, 10) || 0,
      followupSentAt: parseInt(state.followupSentAt, 10) || 0,
      lastBotMessageId: state.lastBotMessageId,
      lastInboundMessageId: state.lastInboundMessageId,
      status: state.status,
      sourceWorkflowId: state.sourceWorkflowId
    };
  }

  async markSent(sessionId) {
    const key = FollowupRedisState.buildKey(sessionId);
    const now = Date.now();

    const pipeline = this.redis.pipeline();
    pipeline.hset(key, {
      followupSentAt: String(now),
      status: 'sent'
    });
    await pipeline.exec();
  }

  async markExpired(sessionId) {
    const key = FollowupRedisState.buildKey(sessionId);
    const state = await this.redis.hgetall(key);
    if (!state || !state.sessionId) return;
    if (state.followupSentAt && state.followupSentAt !== '0') return;

    await this.redis.hset(key, 'status', 'expired');
  }

  async getEligibleSessions() {
    const pattern = `${FOLLOWUP_KEY_PREFIX}*`;
    const keys = await this.redis.keys(pattern);
    const eligible = [];

    for (const key of keys) {
      const state = await this.redis.hgetall(key);
      if (!state || !state.sessionId) continue;
      if (state.status !== 'pending') continue;
      if (state.followupSentAt && state.followupSentAt !== '0') continue;

      const now = Date.now();
      const eligibleAt = parseInt(state.followupEligibleAt, 10) || 0;
      if (now < eligibleAt) continue;

      const lastInboundAt = parseInt(state.lastInboundAt, 10) || 0;
      const lastBotOutboundAt = parseInt(state.lastBotOutboundAt, 10) || 0;
      if (lastInboundAt >= lastBotOutboundAt) continue;

      eligible.push({
        key,
        sessionId: state.sessionId,
        phone: state.phone,
        lastBotMessageId: state.lastBotMessageId,
        sourceWorkflowId: state.sourceWorkflowId
      });
    }

    return eligible;
  }
}

module.exports = { FollowupRedisState, FOLLOWUP_TTL_SECONDS, LOCK_TTL_SECONDS, FOLLOWUP_WINDOW_MINUTES };
