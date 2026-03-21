declare module "sudo-prompt" {
  interface SudoOptions {
    name?: string;
    icns?: string;
    env?: Record<string, string>;
  }

  type ExecCallback = (
    error: Error | undefined,
    stdout: string | Buffer | undefined,
    stderr: string | Buffer | undefined
  ) => void;

  export function exec(
    command: string,
    options: SudoOptions,
    callback: ExecCallback
  ): void;
}
