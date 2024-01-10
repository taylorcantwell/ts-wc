import fs from 'fs';
import process from 'process';

export async function main() {
  try {
    const args = process.argv.slice(2);
    const flags = parseFlags(args);
    const filePath = validateFilePath(args);

    let stdout = '';

    if (filePath) {
      const fileContents = fs.readFileSync(filePath, 'utf-8');
      stdout = `${composeStdout(fileContents, flags)} ${filePath}`;
    } else if (!process.stdin.isTTY) {
      const fileContents = await readStream(process.stdin);
      stdout = composeStdout(fileContents, flags);
    } else {
      throw new Error('No file or stream given');
    }

    console.log(stdout);
    process.exit(0);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}
main();

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

function parseFlags(args: string[]): Flags[] {
  const availableFlags: Set<Flags> = new Set(['-c', '-l', '-w', '-m']);

  const unavailableFlags = args.filter(
    (arg) => !availableFlags.has(arg as Flags) && arg.startsWith('-')
  );

  if (unavailableFlags.length > 0) {
    throw new Error(`Unknown flag: ${unavailableFlags.join(' ')}`);
  }

  const flags = args.filter((arg) =>
    availableFlags.has(arg as Flags)
  ) as Flags[];

  /** Remove duplicate flags */
  return [...new Set(flags)];
}

function validateFilePath(args: string[]): string | undefined {
  const filePath = args.find((arg) => !arg.startsWith('-'));

  if (filePath && !fs.existsSync(filePath)) {
    throw new Error('File does not exist');
  }

  return filePath;
}

function getLineCount(fileContent: string) {
  return fileContent.split('\n').length;
}

function getWordCount(fileContent: string) {
  return fileContent.trim().split(/\s+/).length;
}

function getCharacterCount(fileContent: string) {
  return fileContent.length;
}

function getBytesCount(fileContent: string) {
  return Buffer.byteLength(fileContent);
}

/**
 * Composes the standard output based on the provided file contents and flags.
 * Defaults to returning the line count, word count, and character count (in that order)
 * if no flags are specified.
 */
function composeStdout(fileContents: string, flags: Flags[]) {
  if (flags.length === 0) {
    return `${getLineCount(fileContents)} ${getWordCount(
      fileContents
    )} ${getCharacterCount(fileContents)}`;
  }

  const flagFunctions: Record<Flags, (fileContent: string) => number> = {
    '-c': getCharacterCount,
    '-l': getLineCount,
    '-w': getWordCount,
    '-m': getBytesCount,
  };

  return flags.map((flag) => flagFunctions[flag](fileContents)).join(' ');
}
