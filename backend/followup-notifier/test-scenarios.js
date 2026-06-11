const { evaluateDecision, GAP_TYPES, FOLLOWUP_ELIGIBLE_DELAY_MS } = require('./decision-engine');
const { AuditLogger } = require('./audit-logger');

const TEN_MINUTES = FOLLOWUP_ELIGIBLE_DELAY_MS;
const ELEVEN_MINUTES = TEN_MINUTES + 60000;
const FIVE_MINUTES = 5 * 60 * 1000;
const NOW = Date.now();

const BASE_SESSION = {
  sessionId: 'test-session-001',
  phone: '5511999999999',
  lastBotOutboundAt: new Date(NOW - ELEVEN_MINUTES).toISOString(),
  lastInboundAt: null,
  followupSentAt: null
};

const scenarios = [
  {
    name: 'sem_gap',
    description: 'Sem gaps, janela de 10min ultrapassada, sem resposta do usuario',
    state: {
      ...BASE_SESSION,
      gaps: []
    },
    expectedDecision: 'notify',
    expectedReason: 'elegivel_sem_gaps',
    expectedGapType: GAP_TYPES.NONE
  },
  {
    name: 'gap_novo',
    description: 'Gap nao mapeado detectado (ex: redis indisponivel)',
    state: {
      ...BASE_SESSION,
      gaps: ['redis_unavailable']
    },
    expectedDecision: 'suppress',
    expectedReason: 'gaps_novos_detectados',
    expectedGapType: GAP_TYPES.NEW
  },
  {
    name: 'gap_conhecido',
    description: 'Gap conhecido bloqueia envio (evolution desconectada)',
    state: {
      ...BASE_SESSION,
      gaps: ['evolution_disconnected', 'n8n_api_unauthorized']
    },
    expectedDecision: 'suppress',
    expectedReason: 'gaps_conhecidos_bloqueiam',
    expectedGapType: GAP_TYPES.KNOWN
  },
  {
    name: 'gap_resolvido',
    description: 'Gaps previamente conhecidos foram resolvidos',
    state: {
      ...BASE_SESSION,
      gaps: ['resolved:evolution_disconnected', 'resolved:n8n_api_unauthorized']
    },
    expectedDecision: 'notify',
    expectedReason: 'elegivel_gaps_resolvidos',
    expectedGapType: GAP_TYPES.RESOLVED
  },
  {
    name: 'resposta_antes_de_10min',
    description: 'Usuario respondeu antes da janela de 10min',
    state: {
      ...BASE_SESSION,
      lastBotOutboundAt: new Date(NOW - FIVE_MINUTES).toISOString(),
      lastInboundAt: new Date(NOW - FIVE_MINUTES + 30000).toISOString(),
      gaps: []
    },
    expectedDecision: 'suppress',
    expectedReason: 'resposta_antes_de_10min',
    expectedGapType: GAP_TYPES.NONE
  },
  {
    name: 'nudge_unico_por_sessao',
    description: 'Nudge ja foi enviado nesta sessao (followupSentAt definido)',
    state: {
      ...BASE_SESSION,
      followupSentAt: new Date(NOW - 60000).toISOString(),
      gaps: []
    },
    expectedDecision: 'suppress',
    expectedReason: 'nudge_ja_enviado',
    expectedGapType: GAP_TYPES.NONE
  }
];

async function runTests() {
  const logger = new AuditLogger({ enabled: true });
  const results = [];
  let passed = 0;
  let failed = 0;

  console.log('=== Followup Notifier Validation ===');
  console.log(`Environment: ${process.env.APP_ENV || 'sandbox'}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Scenarios: ${scenarios.length}`);
  console.log('');

  for (const scenario of scenarios) {
    const result = evaluateDecision(scenario.state, { now: NOW });
    const auditEntry = logger.log({
      environment: process.env.APP_ENV || 'sandbox',
      scenario: scenario.name,
      sessionId: scenario.state.sessionId,
      phone: scenario.state.phone,
      gaps: scenario.state.gaps,
      decision: result.decision,
      reason: result.reason,
      context: {
        scenarioDescription: scenario.description,
        expectedDecision: scenario.expectedDecision,
        expectedReason: scenario.expectedReason,
        expectedGapType: scenario.expectedGapType,
        actualGapType: result.gapType,
        resultContext: result.context
      }
    });

    const decisionMatch = result.decision === scenario.expectedDecision;
    const reasonMatch = result.reason === scenario.expectedReason;
    const gapTypeMatch = result.gapType === scenario.expectedGapType;
    const isPass = decisionMatch && reasonMatch && gapTypeMatch;

    if (isPass) {
      passed++;
    } else {
      failed++;
    }

    results.push({
      scenario: scenario.name,
      description: scenario.description,
      passed: isPass,
      decision: {
        expected: scenario.expectedDecision,
        actual: result.decision,
        match: decisionMatch
      },
      reason: {
        expected: scenario.expectedReason,
        actual: result.reason,
        match: reasonMatch
      },
      gapType: {
        expected: scenario.expectedGapType,
        actual: result.gapType,
        match: gapTypeMatch
      }
    });

    const status = isPass ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${scenario.name} - ${scenario.description}`);
    if (!isPass) {
      if (!decisionMatch) {
        console.log(`  decision: expected=${scenario.expectedDecision}, actual=${result.decision}`);
      }
      if (!reasonMatch) {
        console.log(`  reason: expected=${scenario.expectedReason}, actual=${result.reason}`);
      }
      if (!gapTypeMatch) {
        console.log(`  gapType: expected=${scenario.expectedGapType}, actual=${result.gapType}`);
      }
    }
  }

  console.log('');
  console.log('=== Summary ===');
  console.log(`Total: ${scenarios.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('');

  const residualRisks = [
    {
      risk: 'evolution_disconnected',
      severity: 'blocking',
      description: 'Instancia Evolution TEX desconectada (device_removed). Requer QR rescan humano antes de qualquer envio.'
    },
    {
      risk: 'n8n_api_unauthorized',
      severity: 'blocking',
      description: 'API key do n8n retornou 401. Nao e possivel inspecionar workflow, credenciais ou variaveis.'
    },
    {
      risk: 'evolution_api_unauthorized',
      severity: 'blocking',
      description: 'Global key do Evolution retornou 401. Nao e possivel validar estado da instancia por API.'
    },
    {
      risk: 'tex_owner_phone_missing',
      severity: 'warning',
      description: 'Variavel TEX_OWNER_PHONE nao definida. Handoff humano e rotas de fallback incompletos.'
    },
    {
      risk: 'tex_workflow_inactive',
      severity: 'warning',
      description: 'Workflow TEX inativo desde 2026-05-12. Fluxo principal pode nao produzir estado novo no Redis.'
    },
    {
      risk: 'no_production_validation',
      severity: 'info',
      description: 'Testes executados em modo simulado (sandbox). Validacao em producao requer ambiente restaurado.'
    }
  ];

  console.log('=== Residual Risks ===');
  for (const risk of residualRisks) {
    console.log(`[${risk.severity.toUpperCase()}] ${risk.risk}: ${risk.description}`);
  }

  const evidence = {
    timestamp: new Date().toISOString(),
    environment: process.env.APP_ENV || 'sandbox',
    totalScenarios: scenarios.length,
    passed,
    failed,
    results,
    residualRisks,
    logFile: logger._logFilePath()
  };

  console.log('');
  console.log('=== Evidence ===');
  console.log(JSON.stringify(evidence, null, 2));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner failed:', err.message);
  process.exit(1);
});
