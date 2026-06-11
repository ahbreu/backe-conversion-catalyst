const { FollowupRedisState, FOLLOWUP_TTL_SECONDS, LOCK_TTL_SECONDS, FOLLOWUP_WINDOW_MINUTES } = require('./redis-state');
const { createTexFollowupInjection } = require('./tex-injection');
const { createFollowupSchedulerWebhook } = require('./scheduler-webhook');
const { AuditLogger } = require('./audit-logger');

module.exports = {
  FollowupRedisState,
  FOLLOWUP_TTL_SECONDS,
  LOCK_TTL_SECONDS,
  FOLLOWUP_WINDOW_MINUTES,
  createTexFollowupInjection,
  createFollowupSchedulerWebhook,
  AuditLogger
};
