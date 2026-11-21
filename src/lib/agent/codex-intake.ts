import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Codex } from "@openai/codex-sdk";

export async function runCodexIntake({ instructions, input, outputSchema }: {
  instructions: string;
  input: unknown;
  outputSchema: object;
}): Promise<unknown> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.CODEX_MODEL;
  if (!apiKey || !model) throw new Error("Codex intake configuration missing");

  const home = await mkdtemp(join(tmpdir(), "yoonaidee-codex-"));
  try {
    const workingDirectory = join(home, "work");
    const codexHome = join(home, ".codex");
    await mkdir(workingDirectory);
    // The Codex CLI refuses to start when CODEX_HOME does not exist.
    await mkdir(codexHome, { recursive: true });
    const codex = new Codex({
      apiKey,
      env: { HOME: home, CODEX_HOME: codexHome, PATH: "/usr/bin:/bin" },
      config: { features: { shell_tool: false, unified_exec: false, shell_snapshot: false } },
    });
    const thread = codex.startThread({
      model,
      workingDirectory,
      skipGitRepoCheck: true,
      sandboxMode: "read-only",
      approvalPolicy: "never",
      networkAccessEnabled: false,
      webSearchMode: "disabled",
    });
    const { finalResponse } = await thread.run(
      `${instructions}\n\nConversation data (JSON):\n${JSON.stringify(input)}`,
      { outputSchema, signal: AbortSignal.timeout(20_000) },
    );
    return JSON.parse(finalResponse);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}
