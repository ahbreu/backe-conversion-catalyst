// Stub do módulo "cloudflare:workers" para rodar o Worker nos testes (vitest), fora da Cloudflare.
export class WorkflowEntrypoint {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }
}
