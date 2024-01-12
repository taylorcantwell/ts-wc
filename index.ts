import fs from 'fs';
import process from 'process';

export async function main() {
  const { invalidFlags, validFlags, filePath } = parseArgs(
    process.argv.slice(2)
  );

  if (invalidFlags.size > 0) {
    throw new Error(`Invalid flags: ${Array.from(invalidFlags).join(', ')}`);
  }

  if (filePath && !fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }

  let stdout = '';

  if (filePath) {
    const fileContents = fs.readFileSync(filePath, 'utf-8');
    stdout = `${composeStdout(fileContents, validFlags)} ${filePath}`;
  } else if (!process.stdin.isTTY) {
    const fileContents = await readStream(process.stdin);
    stdout = composeStdout(fileContents, validFlags);
  } else {
    throw new Error('No file or stream given');
  }

  console.log(stdout);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exit(1);
});

async function readStream(
  stream: NodeJS.ReadStream | fs.ReadStream
): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

type Flags = '-c' | '-l' | '-w' | '-m';

function parseArgs(args: string[]): {
  invalidFlags: Set<String>;
  validFlags: Set<Flags>;
  filePath: string;
} {
  const availableFlags: Set<Flags> = new Set(['-c', '-l', '-w', '-m']);
  const invalidFlags: Set<string> = new Set();
  const validFlags: Set<Flags> = new Set();
  let filePath = '';

  for (const arg of args) {
    if (availableFlags.has(arg as Flags)) {
      validFlags.add(arg as Flags);
    }

    if (!availableFlags.has(arg as Flags) && arg.startsWith('-')) {
      invalidFlags.add(arg);
    }

    /** Only supporting 1 file */
    if (!arg.startsWith('-')) {
      filePath = arg;
      break;
    }
  }

  return { invalidFlags, validFlags, filePath };
}

function getLineCount(fileContent: string): number {
  return fileContent.split('\n').length;
}

function getWordCount(fileContent: string): number {
  return fileContent.trim().split(/\s+/).length;
}

function getCharacterCount(fileContent: string): number {
  return fileContent.length;
}

function getByteCount(fileContent: string): number {
  return Buffer.byteLength(fileContent);
}

function composeStdout(fileContents: string, flags: Set<Flags>): string {
  if (flags.size === 0) {
    return `${getLineCount(fileContents)} ${getWordCount(
      fileContents
    )} ${getByteCount(fileContents)}`;
  }

  let result = '';

  for (let flag of flags) {
    switch (flag) {
      case '-c': {
        result += getCharacterCount(fileContents);
        break;
      }
      case '-l': {
        result += getLineCount(fileContents);
        break;
      }
      case '-w': {
        result += getWordCount(fileContents);
        break;
      }
      case '-m': {
        result += getByteCount(fileContents);
        break;
      }
      default:
        throw new Error('This should not happen.');
    }
  }

  return result.trim();
}
