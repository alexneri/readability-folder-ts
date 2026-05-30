#!/usr/bin/env node

import * as fs from 'fs/promises';
import * as path from 'path';
import { performance } from 'perf_hooks';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('./package.json') as { version: string; homepage?: string };
const VERSION: string = pkg.version;
const HOMEPAGE: string | undefined = pkg.homepage;

const RELEASE_NOTES = `What's new in readability-ts v${VERSION}

* Idempotent re-runs: existing readability headers are detected via
  readability-score:start / readability-score:end sentinels and replaced
  in place, so re-running the tool no longer stacks duplicate headers.
* Legacy headers written by pre-0.9 versions are auto-migrated on the
  next run.
* Added --dry-run (-n): compute scores without modifying files or
  writing scores.txt.
* Added --version (-v) and --whats-new (--release-notes, -rn).
* Default-skip vendored and build directories: node_modules, .git,
  dist, build, out, .next, .nuxt, .cache, coverage, .idea, .vscode.
* Concurrent processing (8 files at a time) and a TTY progress bar.

For the full changelog see:
https://github.com/alexneri/readability-folder-ts/commits/main
${HOMEPAGE ? `\nFind out more: ${HOMEPAGE}\n` : ''}`;

type FileFormat = 'asciidoc' | 'markdown';

const SUPPORTED_EXTENSIONS: ReadonlyMap<string, FileFormat> = new Map([
    ['.adoc', 'asciidoc'],
    ['.asciidoc', 'asciidoc'],
    ['.md', 'markdown'],
    ['.markdown', 'markdown'],
    ['.mdx', 'markdown'],
]);

const EXCLUDED_DIRS: ReadonlySet<string> = new Set([
    '.git', 'node_modules', 'dist', 'build', 'out',
    '.next', '.nuxt', '.cache', 'coverage', '.idea', '.vscode',
]);

const CONCURRENCY = 8;

const HEADER_START = 'readability-score:start';
const HEADER_END = 'readability-score:end';

interface Tokens {
    sentences: number;
    words: string[];
    syllableCounts: number[];
}

interface FileStats {
    score: number;
    rating: string;
    lineCount: number;
    sentenceCount: number;
    wordCount: number;
    avgWordLength: number;
    avgSyllables: number;
    hasCodeBlock: boolean;
    acronymCount: number;
}

function detectFormat(filePath: string): FileFormat | null {
    const ext = path.extname(filePath).toLowerCase();
    return SUPPORTED_EXTENSIONS.get(ext) ?? null;
}

function countSyllables(word: string): number {
    const w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (w.length === 0) return 0;
    if (w.length <= 3) return 1;

    const vowels = 'aeiouy';
    let count = 0;
    let prevWasVowel = false;
    for (const c of w) {
        const isVowel = vowels.includes(c);
        if (isVowel && !prevWasVowel) count++;
        prevWasVowel = isVowel;
    }
    if (w.endsWith('e')) count--;
    return Math.max(1, count);
}

function tokenize(text: string): Tokens {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const words = text.split(/\s+/).filter(Boolean);
    const syllableCounts = words.map(countSyllables);
    return { sentences, words, syllableCounts };
}

function fleschKincaid(tokens: Tokens): number {
    const { words, syllableCounts } = tokens;
    if (words.length === 0) return 0;
    const sentenceCount = Math.max(tokens.sentences, 1);
    const totalSyllables = syllableCounts.reduce((a, b) => a + b, 0);
    const score = 206.835
        - 1.015 * (words.length / sentenceCount)
        - 84.6 * (totalSyllables / words.length);
    return Math.max(0, Math.min(100, score));
}

function getRating(score: number): string {
    if (score >= 90) return '5th-6th grade level - Very easy to read.';
    if (score >= 80) return '7th grade level - Fairly easy to read.';
    if (score >= 70) return '8th & 9th grade - Plain English.';
    if (score >= 60) return '10th-12th grade - Fairly difficult to read.';
    if (score >= 50) return 'College - Difficult to read.';
    if (score >= 30) return 'College grad - Very difficult to read.';
    return 'Professional - Extremely difficult to read.';
}

function stripExistingHeader(content: string, format: FileFormat): string {
    const startPattern = format === 'markdown'
        ? /<!--\s*readability-score:start\s*-->/
        : /\/\/\s*readability-score:start/;
    const endPattern = format === 'markdown'
        ? /<!--\s*readability-score:end\s*-->\n?/
        : /\/\/\s*readability-score:end\n?/;
    const startMatch = startPattern.exec(content);
    if (!startMatch) return content;
    const afterStart = content.slice(startMatch.index);
    const endMatch = endPattern.exec(afterStart);
    if (!endMatch) return content;
    const cutEnd = startMatch.index + endMatch.index + endMatch[0].length;
    return (content.slice(0, startMatch.index) + content.slice(cutEnd)).replace(/^\n+/, '');
}

function stripLegacyHeader(content: string): string {
    if (!/^\/\/ Readability score: \d/.test(content)) return content;
    const lines = content.split('\n');
    let i = 0;
    while (i < 3 && i < lines.length && lines[i].startsWith('//')) i++;
    while (i < lines.length && lines[i].trim() === '') i++;
    return lines.slice(i).join('\n');
}

function stripMarkdown(content: string): { cleaned: string; hasCodeBlock: boolean } {
    let text = content;
    let hasCodeBlock = false;

    text = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
    text = text.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, () => { hasCodeBlock = true; return ''; });
    if (/(^|\n)( {4}|\t)\S/.test(text)) hasCodeBlock = true;
    text = text.replace(/(^|\n)( {4}|\t)[^\n]*/g, '$1');
    text = text.replace(/`[^`\n]+`/g, '');
    text = text.replace(/<!--[\s\S]*?-->/g, '');
    text = text.replace(/<\/?[a-zA-Z][^>]*>/g, '');
    text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
    text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
    text = text.replace(/^\s*\[[^\]]+\]:\s*\S+.*$/gm, '');
    text = text.replace(/^\s{0,3}#{1,6}\s+/gm, '');
    text = text.replace(/^\s{0,3}>\s?/gm, '');
    text = text.replace(/^\s*[-*+]\s+/gm, '');
    text = text.replace(/^\s*\d+\.\s+/gm, '');
    text = text.replace(/^[=\-*_]{2,}\s*$/gm, '');
    text = text.replace(/^\s*\|?\s*[-:]+(\s*\|\s*[-:]+)+\s*\|?\s*$/gm, '');
    text = text.replace(/\|/g, ' ');
    text = text.replace(/(\*\*|__)(.+?)\1/g, '$2');
    text = text.replace(/(\*|_)(.+?)\1/g, '$2');
    text = text.replace(/~~(.+?)~~/g, '$1');

    return { cleaned: text.trim(), hasCodeBlock };
}

function stripAsciidoc(content: string): { cleaned: string; hasCodeBlock: boolean } {
    let text = content;
    let hasCodeBlock = false;

    text = text.replace(/^----\s*\r?\n[\s\S]*?\r?\n----\s*$/gm, () => { hasCodeBlock = true; return ''; });
    text = text.replace(/^\.\.\.\.\s*\r?\n[\s\S]*?\r?\n\.\.\.\.\s*$/gm, () => { hasCodeBlock = true; return ''; });
    text = text.replace(/```[\s\S]*?```/g, () => { hasCodeBlock = true; return ''; });
    text = text.replace(/^\/\/.*$/gm, '');
    text = text.replace(/^\[[^\]]*\]\s*$/gm, '');
    text = text.replace(/\[\[[^\]]+\]\]/g, '');
    text = text.replace(/<<[^>]+>>/g, '');
    text = text.replace(/^[a-zA-Z]+::[^\n]*$/gm, '');
    text = text.replace(/^=+\s+/gm, '');
    text = text.replace(/^\s*[-*]\s+/gm, '');
    text = text.replace(/^\s*\.+\s+/gm, '');
    text = text.replace(/`([^`\n]+)`/g, '$1');
    text = text.replace(/\*([^*\n]+)\*/g, '$1');
    text = text.replace(/_([^_\n]+)_/g, '$1');

    return { cleaned: text.trim(), hasCodeBlock };
}

function clean(content: string, format: FileFormat): { cleaned: string; hasCodeBlock: boolean } {
    return format === 'markdown' ? stripMarkdown(content) : stripAsciidoc(content);
}

function countAcronyms(text: string): number {
    const matches = text.match(/\b[A-Z]{2,}\b/g);
    return matches ? matches.length : 0;
}

function formatHeader(stats: FileStats, format: FileFormat): string {
    const lines = [
        HEADER_START,
        `Readability score: ${stats.score.toFixed(2)}`,
        stats.rating,
        `File length: ${stats.lineCount}, Sentence count: ${stats.sentenceCount}, ` +
        `Word count: ${stats.wordCount}, Average word length: ${stats.avgWordLength.toFixed(2)}, ` +
        `Average syllables per word: ${stats.avgSyllables.toFixed(2)}, ` +
        `Code present: ${stats.hasCodeBlock ? 'Yes' : 'No'}, Acronyms: ${stats.acronymCount}`,
        HEADER_END,
    ];
    const wrapped = format === 'markdown'
        ? lines.map(l => `<!-- ${l} -->`)
        : lines.map(l => `// ${l}`);
    return wrapped.join('\n') + '\n\n';
}

async function scanDirectory(dirPath: string, seen: Set<string> = new Set()): Promise<string[]> {
    const real = await fs.realpath(dirPath).catch(() => dirPath);
    if (seen.has(real)) return [];
    seen.add(real);

    const out: string[] = [];
    let entries;
    try {
        entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch {
        return out;
    }

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            if (EXCLUDED_DIRS.has(entry.name)) continue;
            const sub = await scanDirectory(fullPath, seen);
            for (const f of sub) out.push(f);
        } else if (entry.isFile() && detectFormat(entry.name)) {
            out.push(fullPath);
        }
    }
    return out;
}

async function processFile(filePath: string, dryRun: boolean): Promise<FileStats> {
    const format = detectFormat(filePath);
    if (!format) throw new Error(`Unsupported file: ${filePath}`);

    const raw = await fs.readFile(filePath, 'utf-8');
    const withoutLegacy = stripLegacyHeader(raw);
    const content = stripExistingHeader(withoutLegacy, format);
    const { cleaned, hasCodeBlock } = clean(content, format);
    const tokens = tokenize(cleaned);

    const score = fleschKincaid(tokens);
    const wordCount = tokens.words.length;
    const totalSyllables = tokens.syllableCounts.reduce((a, b) => a + b, 0);
    const totalWordLength = tokens.words.reduce((sum, w) => sum + w.length, 0);

    const stats: FileStats = {
        score,
        rating: getRating(score),
        lineCount: content.split('\n').length,
        sentenceCount: tokens.sentences,
        wordCount,
        avgWordLength: wordCount > 0 ? totalWordLength / wordCount : 0,
        avgSyllables: wordCount > 0 ? totalSyllables / wordCount : 0,
        hasCodeBlock,
        acronymCount: countAcronyms(cleaned),
    };

    if (!dryRun) {
        await fs.writeFile(filePath, formatHeader(stats, format) + content);
    }
    return stats;
}

async function processWithConcurrency(
    items: string[],
    limit: number,
    worker: (item: string) => Promise<FileStats>,
    onDone: (item: string, result: FileStats) => void,
): Promise<void> {
    let cursor = 0;
    const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (cursor < items.length) {
            const i = cursor++;
            const item = items[i];
            const result = await worker(item);
            onDone(item, result);
        }
    });
    await Promise.all(runners);
}

function displayProgressBar(processed: number, total: number): void {
    if (!process.stdout.isTTY) return;
    const pct = Math.floor((processed / total) * 100);
    const filled = Math.floor(pct / 2);
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(`Progress: [${'='.repeat(filled)}${' '.repeat(50 - filled)}] ${pct}%`);
}

interface CliArgs {
    folderPath: string;
    dryRun: boolean;
    help: boolean;
    version: boolean;
    whatsNew: boolean;
}

function parseArgs(argv: string[]): CliArgs {
    const args = argv.slice(2);
    const dryRun = args.includes('--dry-run') || args.includes('-n');
    const help = args.includes('--help') || args.includes('-h');
    const version = args.includes('--version') || args.includes('-v');
    const whatsNew = args.includes('--whats-new')
        || args.includes('--release-notes')
        || args.includes('-rn');
    const positional = args.filter(a => !a.startsWith('-'));
    const folderPath = positional[0] || process.cwd();
    return { folderPath, dryRun, help, version, whatsNew };
}

function printHelp(): void {
    console.log(
        'Usage: readability-ts [path] [options]\n\n' +
        'Computes Flesch-Kincaid readability scores for AsciiDoc and Markdown files.\n\n' +
        'Arguments:\n' +
        '  path                          Folder to scan (defaults to current directory)\n\n' +
        'Options:\n' +
        '  -n,  --dry-run                Compute scores without modifying files or writing scores.txt\n' +
        '  -v,  --version                Print the installed version and exit\n' +
        '  -rn, --whats-new,\n' +
        '       --release-notes          Print release notes for the current version and exit\n' +
        '  -h,  --help                   Show this message and exit\n\n' +
        'Supported extensions: .adoc, .asciidoc, .md, .markdown, .mdx\n\n' +
        'Examples:\n' +
        '  readability-ts                Scan the current folder\n' +
        '  readability-ts ./docs         Scan a specific folder\n' +
        '  readability-ts ./docs -n      Preview scores without writing anything'
    );
}

function printVersion(): void {
    console.log(`readability-ts v${VERSION}`);
}

function printWhatsNew(): void {
    console.log(RELEASE_NOTES);
}

async function main(): Promise<void> {
    const start = performance.now();
    const { folderPath, dryRun, help, version, whatsNew } = parseArgs(process.argv);

    if (help) {
        printHelp();
        return;
    }
    if (version) {
        printVersion();
        return;
    }
    if (whatsNew) {
        printWhatsNew();
        return;
    }

    try {
        const files = await scanDirectory(folderPath);

        if (files.length === 0) {
            console.log('No supported files found (.adoc, .asciidoc, .md, .markdown, .mdx).');
            return;
        }

        const summary: string[] = [];
        let done = 0;

        await processWithConcurrency(
            files,
            CONCURRENCY,
            file => processFile(file, dryRun),
            (file, stats) => {
                summary.push(
                    `${file}, Readability score: ${stats.score.toFixed(2)}` +
                    `, File length: ${stats.lineCount}` +
                    `, Sentence count: ${stats.sentenceCount}` +
                    `, Word count: ${stats.wordCount}` +
                    `, Average word length: ${stats.avgWordLength.toFixed(2)}` +
                    `, Average syllables per word: ${stats.avgSyllables.toFixed(2)}` +
                    `, Code present: ${stats.hasCodeBlock ? 'Yes' : 'No'}` +
                    `, Acronyms: ${stats.acronymCount}`
                );
                done++;
                displayProgressBar(done, files.length);
            }
        );

        summary.sort();

        if (!dryRun) {
            await fs.writeFile(path.join(folderPath, 'scores.txt'), summary.join('\n') + '\n');
        }

        const seconds = ((performance.now() - start) / 1000).toFixed(2);
        const suffix = dryRun ? ' (dry-run: no files were modified)' : '';
        console.log(`\nReadability scores computed! Total files processed: ${done} in ${seconds} seconds.${suffix}`);
        if (!dryRun) console.log('Summary of scores saved to scores.txt');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error:', message);
        process.exit(1);
    }
}

void main();
