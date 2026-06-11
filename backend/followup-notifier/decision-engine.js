const FOLLOWUP_ELIGIBLE_DELAY_MS = 10 * 60 * 1000;

const GAP_TYPES = {
  NONE: 'sem_gap',
  NEW: 'gap_novo',
  KNOWN: 'gap_conhecido',
  RESOLVED: 'gap_resolvido'
};

const KNOWN_GAPS = new Set([
  'evolution_disconnected',
  'n8n_api_unauthorized',
  'evolution_api_unauthorized',
  'tex_owner_phone_missing',
  'tex_workflow_inactive'
]);

function classifyGaps(gaps = []) {
  if (!gaps || gaps.length === 0) {
    return GAP_TYPES.NONE;
  }

  const allKnown = gaps.every(g => KNOWN_GAPS.has(g));
  const allResolved = gaps.every(g => g.startsWith('resolved:'));

  if (allResolved) {
    return GAP_TYPES.RESOLVED;
  }

  if (allKnown) {
    return GAP_TYPES.KNOWN;
  }

  return GAP_TYPES.NEW;
}

function evaluateDecision(state, options = {}) {
  const now = options.now || Date.now();
  const gaps = state.gaps || [];
  const gapType = classifyGaps(gaps);

  const lastBotOutboundAt = state.lastBotOutboundAt ? new Date(state.lastBotOutboundAt).getTime() : null;
  const lastInboundAt = state.lastInboundAt ? new Date(state.lastInboundAt).getTime() : null;
  const followupSentAt = state.followupSentAt ? new Date(state.followupSentAt).getTime() : null;

  const gapsDetected = gaps.filter(g => !g.startsWith('resolved:'));
  const resolvedGaps = gaps.filter(g => g.startsWith('resolved:')).map(g => g.replace('resolved:', ''));

  if (followupSentAt) {
    return {
      decision: 'suppress',
      reason: 'nudge_ja_enviado',
      gapType,
      gapsDetected,
      resolvedGaps,
      context: { followupSentAt: new Date(followupSentAt).toISOString() }
    };
  }

  if (!lastBotOutboundAt) {
    return {
      decision: 'suppress',
      reason: 'sem_mensagem_bot_pendente',
      gapType,
      gapsDetected,
      resolvedGaps,
      context: {}
    };
  }

  if (lastInboundAt && lastInboundAt > lastBotOutboundAt) {
    return {
      decision: 'suppress',
      reason: 'resposta_antes_de_10min',
      gapType,
      gapsDetected,
      resolvedGaps,
      context: {
        lastBotOutboundAt: new Date(lastBotOutboundAt).toISOString(),
        lastInboundAt: new Date(lastInboundAt).toISOString(),
        elapsedMs: lastInboundAt - lastBotOutboundAt,
        elapsedSeconds: Math.round((lastInboundAt - lastBotOutboundAt) / 1000)
      }
    };
  }

  const elapsedSinceBotOutbound = now - lastBotOutboundAt;
  const timeSinceEligible = elapsedSinceBotOutbound - FOLLOWUP_ELIGIBLE_DELAY_MS;

  if (elapsedSinceBotOutbound < FOLLOWUP_ELIGIBLE_DELAY_MS) {
    return {
      decision: 'suppress',
      reason: 'aguardando_janela_10min',
      gapType,
      gapsDetected,
      resolvedGaps,
      context: {
        lastBotOutboundAt: new Date(lastBotOutboundAt).toISOString(),
        elapsedMs: elapsedSinceBotOutbound,
        elapsedSeconds: Math.round(elapsedSinceBotOutbound / 1000),
        remainingMs: FOLLOWUP_ELIGIBLE_DELAY_MS - elapsedSinceBotOutbound,
        remainingSeconds: Math.round((FOLLOWUP_ELIGIBLE_DELAY_MS - elapsedSinceBotOutbound) / 1000)
      }
    };
  }

  if (gapType === GAP_TYPES.NONE) {
    return {
      decision: 'notify',
      reason: 'elegivel_sem_gaps',
      gapType,
      gapsDetected,
      resolvedGaps,
      context: {
        lastBotOutboundAt: new Date(lastBotOutboundAt).toISOString(),
        elapsedMs: elapsedSinceBotOutbound,
        elapsedSeconds: Math.round(elapsedSinceBotOutbound / 1000)
      }
    };
  }

  if (gapType === GAP_TYPES.KNOWN) {
    return {
      decision: 'suppress',
      reason: 'gaps_conhecidos_bloqueiam',
      gapType,
      gapsDetected,
      resolvedGaps,
      context: {
        blockingGaps: gapsDetected
      }
    };
  }

  if (gapType === GAP_TYPES.NEW) {
    return {
      decision: 'suppress',
      reason: 'gaps_novos_detectados',
      gapType,
      gapsDetected,
      resolvedGaps,
      context: {
        newGaps: gapsDetected
      }
    };
  }

  return {
    decision: 'notify',
    reason: 'elegivel_gaps_resolvidos',
    gapType,
    gapsDetected,
    resolvedGaps,
    context: {
      lastBotOutboundAt: new Date(lastBotOutboundAt).toISOString(),
      elapsedMs: elapsedSinceBotOutbound,
      elapsedSeconds: Math.round(elapsedSinceBotOutbound / 1000)
    }
  };
}

module.exports = {
  evaluateDecision,
  classifyGaps,
  GAP_TYPES,
  KNOWN_GAPS,
  FOLLOWUP_ELIGIBLE_DELAY_MS
};
