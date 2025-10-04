import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ChromeDevToolsParams {
  // Define the parameters that your tool will accept from the frontend
  // For example:
  // url: string;
  // instructions: string;
  [key: string]: any;
}

/**
 * Executes the chrome-devtools-mcp using npx.
 * @param params The parameters for the chrome-devtools tool.
 * @returns The stdout from the command execution.
 */
export async function runChromeDevTools(params: ChromeDevToolsParams): Promise<string> {
  // IMPORTANT: The command arguments must be carefully sanitized
  // to prevent command injection vulnerabilities.
  // For this example, we'll assume the params are safe, but in a real
  // application, you would validate and escape them.

  const args = Object.entries(params)
    .map(([key, value]) => `--${key}="${value}"`)
    .join(' ');

  // The command to be executed.
  // Using npx ensures that the latest version of the MCP is always used.
  const command = `npx chrome-devtools-mcp@latest ${args}`;

  console.log(`Executing command: ${command}`);

  try {
    const { stdout, stderr } = await execAsync(command);
    if (stderr) {
      console.error(`stderr from chrome-devtools-mcp: ${stderr}`);
    }
    return stdout;
  } catch (error) {
    console.error(`Error executing chrome-devtools-mcp: ${error}`);
    throw new Error('Failed to execute Chrome DevTools task.');
  }
}