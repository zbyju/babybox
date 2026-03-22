/**
 * Suggestion types for actionable error recovery hints.
 * All user-facing messages are in Czech.
 */

import type { ShellCommand, DirectoryPath } from "./branded";

/**
 * A suggestion that can help the user recover from an error.
 * Different kinds have different shapes for their data.
 */
export type Suggestion =
  | TerminalSuggestion
  | ManualActionSuggestion
  | DocumentationSuggestion
  | ContactSupportSuggestion;

/**
 * Suggestion to run a command in terminal.
 */
export type TerminalSuggestion = {
  readonly kind: "terminal";
  readonly scope: TerminalScope;
  readonly command: ShellCommand;
  readonly message: string; // Czech description
};

export type TerminalScope =
  | { readonly kind: "global" }
  | { readonly kind: "directory"; readonly path: DirectoryPath };

/**
 * Suggestion for manual action (not a command).
 */
export type ManualActionSuggestion = {
  readonly kind: "manual_action";
  readonly action: ManualAction;
  readonly message: string; // Czech description
};

export type ManualAction =
  | { readonly kind: "check_network" }
  | { readonly kind: "check_disk_space" }
  | { readonly kind: "restart_machine" }
  | { readonly kind: "check_permissions"; readonly path: string }
  | { readonly kind: "custom"; readonly description: string };

/**
 * Suggestion to read documentation.
 */
export type DocumentationSuggestion = {
  readonly kind: "documentation";
  readonly topic: string;
  readonly url?: string | undefined;
  readonly message: string; // Czech description
};

/**
 * Suggestion to contact support.
 */
export type ContactSupportSuggestion = {
  readonly kind: "contact_support";
  readonly severity: "low" | "medium" | "high" | "critical";
  readonly context: string;
  readonly message: string; // Czech description
};

// Constructor helpers
export const Suggestion = {
  terminalGlobal: (command: ShellCommand, message: string): TerminalSuggestion => ({
    kind: "terminal",
    scope: { kind: "global" },
    command,
    message,
  }),

  terminalInDirectory: (
    command: ShellCommand,
    directory: DirectoryPath,
    message: string,
  ): TerminalSuggestion => ({
    kind: "terminal",
    scope: { kind: "directory", path: directory },
    command,
    message,
  }),

  checkNetwork: (message: string): ManualActionSuggestion => ({
    kind: "manual_action",
    action: { kind: "check_network" },
    message,
  }),

  checkDiskSpace: (message: string): ManualActionSuggestion => ({
    kind: "manual_action",
    action: { kind: "check_disk_space" },
    message,
  }),

  restartMachine: (message: string): ManualActionSuggestion => ({
    kind: "manual_action",
    action: { kind: "restart_machine" },
    message,
  }),

  checkPermissions: (path: string, message: string): ManualActionSuggestion => ({
    kind: "manual_action",
    action: { kind: "check_permissions", path },
    message,
  }),

  documentation: (topic: string, message: string, url?: string): DocumentationSuggestion => {
    const base = { kind: "documentation" as const, topic, message };
    return url !== undefined ? { ...base, url } : base;
  },

  contactSupport: (
    severity: "low" | "medium" | "high" | "critical",
    context: string,
    message: string,
  ): ContactSupportSuggestion => ({
    kind: "contact_support",
    severity,
    context,
    message,
  }),
} as const;
