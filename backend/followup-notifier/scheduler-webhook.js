const express = require('express');
const { FollowupRedisState } = require('./redis-state');
const { AuditLogger } = require('./audit-logger');

function createFollowupSchedulerWebhook(redisClient) {
  const router = express.Router();
  const state = new FollowupRedisState(redisClient);
  const audit = new AuditLogger();

  const authenticate = (req, res, next) => {
    const token = req.headers['x-scheduler-token'];
    const expected = process.env.FOLLOWUP_SCHEDULER_TOKEN;

    if (!expected) {
      return res.status(500).json({ ok: false, error: 'scheduler_token_not_configured' });
    }

    if (token !== expected) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    next();
  };

  router.post('/followup-scheduler', authenticate, async (req, res) => {
    const { action, sessionId } = req.body;

    try {
      switch (action) {
        case 'scan_eligible': {
          const sessions = await state.getEligibleSessions();
          audit.log({
            event: 'followup_scan',
            scenario: 'scheduler_scan',
            sessionId: null,
            decision: sessions.length > 0 ? 'notify' : 'suppress',
            reason: sessions.length > 0 ? `${sessions.length} eligible sessions found` : 'no eligible sessions',
            context: { count: sessions.length }
          });
          return res.json({ ok: true, sessions });
        }

        case 'acquire_lock': {
          if (!sessionId) {
            return res.status(400).json({ ok: false, error: 'session_id_required' });
          }
          const acquired = await state.acquireLock(sessionId);
          return res.json({ ok: true, acquired, sessionId });
        }

        case 'release_lock': {
          if (!sessionId) {
            return res.status(400).json({ ok: false, error: 'session_id_required' });
          }
          await state.releaseLock(sessionId);
          return res.json({ ok: true, released: true, sessionId });
        }

        case 'revalidate': {
          if (!sessionId) {
            return res.status(400).json({ ok: false, error: 'session_id_required' });
          }
          const followupState = await state.getFollowupState(sessionId);

          if (!followupState) {
            return res.json({ ok: true, eligible: false, reason: 'state_not_found' });
          }

          if (followupState.status !== 'pending') {
            return res.json({ ok: true, eligible: false, reason: `status_is_${followupState.status}` });
          }

          if (followupState.followupSentAt > 0) {
            return res.json({ ok: true, eligible: false, reason: 'already_sent' });
          }

          const now = Date.now();
          if (now < followupState.followupEligibleAt) {
            return res.json({ ok: true, eligible: false, reason: 'not_yet_eligible' });
          }

          if (followupState.lastInboundAt >= followupState.lastBotOutboundAt) {
            await state.cancelFollowup(sessionId, 'user_replied');
            return res.json({ ok: true, eligible: false, reason: 'user_replied_after_bot' });
          }

          return res.json({
            ok: true,
            eligible: true,
            sessionId: followupState.sessionId,
            phone: followupState.phone,
            lastBotMessageId: followupState.lastBotMessageId
          });
        }

        case 'mark_sent': {
          if (!sessionId) {
            return res.status(400).json({ ok: false, error: 'session_id_required' });
          }
          await state.markSent(sessionId);
          const followupState = await state.getFollowupState(sessionId);
          audit.log({
            event: 'followup_sent',
            scenario: 'nudge_delivered',
            sessionId,
            phone: followupState?.phone,
            decision: 'notify',
            reason: 'followup nudge sent successfully',
            context: { sentAt: followupState?.followupSentAt }
          });
          return res.json({ ok: true, sent: true, sessionId });
        }

        default:
          return res.status(400).json({ ok: false, error: 'unknown_action', action });
      }
    } catch (error) {
      audit.log({
        event: 'followup_error',
        scenario: 'scheduler_error',
        sessionId,
        decision: 'suppress',
        reason: error.message,
        context: { action, stack: error.stack }
      });
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}

module.exports = { createFollowupSchedulerWebhook };
