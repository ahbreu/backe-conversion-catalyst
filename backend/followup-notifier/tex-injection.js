const { FollowupRedisState } = require('./redis-state');

function createTexFollowupInjection(redisClient) {
  const state = new FollowupRedisState(redisClient);

  async function onBotOutbound(sessionId, phone, botMessageId, workflowId) {
    await state.markOutbound(sessionId, phone, botMessageId, workflowId);
  }

  async function onUserInbound(sessionId, inboundMessageId) {
    return state.markInbound(sessionId, inboundMessageId);
  }

  async function onSessionEnd(sessionId) {
    return state.cancelFollowup(sessionId, 'session_ended');
  }

  async function onHandoff(sessionId) {
    return state.cancelFollowup(sessionId, 'human_handoff');
  }

  async function onOptOut(sessionId) {
    return state.cancelFollowup(sessionId, 'user_opt_out');
  }

  return {
    onBotOutbound,
    onUserInbound,
    onSessionEnd,
    onHandoff,
    onOptOut,
    state
  };
}

module.exports = { createTexFollowupInjection };
