declare module "composio-core" {
  export interface ComposioEntity {
    execute<T = unknown>(args: {
      actionName: string;
      params?: Record<string, unknown>;
      text?: string;
      connectedAccountId?: string;
    }): Promise<T>;
  }

  export class Composio {
    constructor(config?: {
      apiKey?: string;
      baseUrl?: string;
      runtime?: string;
      allowTracing?: boolean;
    });

    getEntity(id?: string): ComposioEntity;
  }
}
