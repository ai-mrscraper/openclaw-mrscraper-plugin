// OpenClaw 2026.9.8 publishes this runtime subpath without a declaration file.
// Keep this narrow adapter aligned with the documented provider-web-fetch contract.
declare module "openclaw/plugin-sdk/provider-web-fetch" {
  import type { OpenClawConfig } from "openclaw/plugin-sdk/config-runtime";

  export type WebFetchProviderPlugin = {
    id: string;
    label: string;
    hint: string;
    envVars: string[];
    placeholder: string;
    signupUrl: string;
    docsUrl?: string;
    autoDetectOrder?: number;
    credentialPath: string;
    inactiveSecretPaths?: string[];
    getCredentialValue: (fetchConfig?: Record<string, unknown>) => unknown;
    setCredentialValue: (fetchConfigTarget: Record<string, unknown>, value: unknown) => void;
    getConfiguredCredentialValue?: (config?: OpenClawConfig) => unknown;
    setConfiguredCredentialValue?: (configTarget: OpenClawConfig, value: unknown) => void;
    applySelectionConfig?: (config: OpenClawConfig) => OpenClawConfig;
    createTool: (ctx: { config?: OpenClawConfig }) => {
      description: string;
      parameters: Record<string, unknown>;
      execute: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
    };
  };

  export function readResponseText(response: Response, options: { maxBytes: number }): Promise<{ text: string; truncated: boolean }>;
  export function resolveTimeoutSeconds(override: number | undefined, fallback: number): number;
  export function withStrictWebToolsEndpoint<T>(
    options: { url: string; timeoutSeconds: number; init?: RequestInit },
    run: (result: { response: Response; finalUrl: string }) => Promise<T>,
  ): Promise<T>;
  export function wrapExternalContent(content: string, options: { source: "web_fetch"; includeWarning?: boolean }): string;
  export function wrapWebContent(content: string, source: "web_fetch"): string;
  export function jsonResult(payload: unknown): { content: Array<{ type: "text"; text: string }>; details: unknown };
  export function readNumberParam(params: Record<string, unknown>, key: string, options?: { integer?: boolean }): number | undefined;
  export function readStringParam(params: Record<string, unknown>, key: string, options?: { required?: boolean }): string;
  export function enablePluginInConfig(config: OpenClawConfig, pluginId: string): { config: OpenClawConfig };
}
