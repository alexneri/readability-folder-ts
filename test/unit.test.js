'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
    VERSION,
    HOMEPAGE,
    RELEASE_NOTES,
    detectFormat,
    countSyllables,
    tokenize,
    fleschKincaid,
    getRating,
    stripExistingHeader,
    stripLegacyHeader,
    stripMarkdown,
    stripAsciidoc,
    countAcronyms,
    formatHeader,
    parseArgs,
    printHelp,
    printVersion,
    printWhatsNew,
} = require('../readability.js');

function captureStdout(fn) {
    const original = console.log;
    const lines = [];
    console.log = (...args) => lines.push(args.map(String).join(' '));
    try {
        fn();
    } finally {
        console.log = original;
    }
    return lines.join('\n');
}

test('VERSION matches package.json', () => {
    const pkg = require('../package.json');
    assert.equal(VERSION, pkg.version);
});

test('HOMEPAGE matches package.json', () => {
    const pkg = require('../package.json');
    assert.equal(HOMEPAGE, pkg.homepage);
});

test('RELEASE_NOTES includes version and homepage', () => {
    assert.match(RELEASE_NOTES, new RegExp(`v${VERSION}`));
    assert.ok(HOMEPAGE === undefined || RELEASE_NOTES.includes(HOMEPAGE));
});

test('detectFormat returns the right format for each supported extension', () => {
    assert.equal(detectFormat('foo.md'), 'markdown');
    assert.equal(detectFormat('foo.markdown'), 'markdown');
    assert.equal(detectFormat('foo.mdx'), 'markdown');
    assert.equal(detectFormat('foo.adoc'), 'asciidoc');
    assert.equal(detectFormat('foo.asciidoc'), 'asciidoc');
    assert.equal(detectFormat('foo.MD'), 'markdown', 'extension match is case-insensitive');
    assert.equal(detectFormat('foo.txt'), null);
    assert.equal(detectFormat('README'), null);
});

test('countSyllables handles edge cases', () => {
    assert.equal(countSyllables(''), 0);
    assert.equal(countSyllables('a'), 1);
    assert.equal(countSyllables('the'), 1, 'words <=3 chars are always 1');
    assert.equal(countSyllables('hello'), 2);
    assert.equal(countSyllables('readability'), 5);
    assert.equal(countSyllables('123'), 0, 'non-letters strip to empty -> 0');
    assert.equal(countSyllables('MAKE'), 1, 'silent trailing e drops a syllable but min is 1');
});

test('tokenize counts sentences and words', () => {
    const t = tokenize('Hello world. This is a test! Is it?');
    assert.equal(t.sentences, 3);
    assert.equal(t.words.length, 8);
    assert.equal(t.syllableCounts.length, 8);
});

test('fleschKincaid returns 0 for empty input', () => {
    assert.equal(fleschKincaid({ sentences: 0, words: [], syllableCounts: [] }), 0);
});

test('fleschKincaid is bounded to [0,100]', () => {
    const easy = tokenize('The cat sat on the mat. The dog ran.');
    const s = fleschKincaid(easy);
    assert.ok(s >= 0 && s <= 100, `score ${s} out of range`);
});

test('getRating bucket boundaries', () => {
    assert.match(getRating(95), /5th-6th grade/);
    assert.match(getRating(85), /7th grade/);
    assert.match(getRating(75), /8th & 9th grade/);
    assert.match(getRating(65), /10th-12th grade/);
    assert.match(getRating(55), /College - Difficult/);
    assert.match(getRating(40), /College grad/);
    assert.match(getRating(10), /Professional/);
});

test('stripExistingHeader is idempotent for markdown', () => {
    const body = '# Hello\n\nSome content.\n';
    const wrapped =
        '<!-- readability-score:start -->\n' +
        '<!-- Readability score: 70 -->\n' +
        '<!-- 8th & 9th grade - Plain English. -->\n' +
        '<!-- readability-score:end -->\n\n' +
        body;
    assert.equal(stripExistingHeader(wrapped, 'markdown'), body);
    assert.equal(stripExistingHeader(body, 'markdown'), body, 'no-op on un-headered content');
});

test('stripExistingHeader is idempotent for asciidoc', () => {
    const body = '= Hello\n\nSome content.\n';
    const wrapped =
        '// readability-score:start\n' +
        '// Readability score: 70\n' +
        '// readability-score:end\n\n' +
        body;
    assert.equal(stripExistingHeader(wrapped, 'asciidoc'), body);
});

test('stripLegacyHeader removes pre-0.9 headers', () => {
    const legacy = '// Readability score: 65.42\n// Plain English.\n// Word count: 10\n\nBody text here.';
    const cleaned = stripLegacyHeader(legacy);
    assert.equal(cleaned, 'Body text here.');
});

test('stripLegacyHeader leaves non-matching content alone', () => {
    const content = '// This is just a comment\nMore content.';
    assert.equal(stripLegacyHeader(content), content);
});

test('stripMarkdown strips code fences and reports presence', () => {
    const input = '# Title\n\nProse.\n\n```\ncode here\n```\n\nMore prose.';
    const { cleaned, hasCodeBlock } = stripMarkdown(input);
    assert.equal(hasCodeBlock, true);
    assert.ok(!cleaned.includes('code here'));
    assert.ok(cleaned.includes('Prose.'));
});

test('stripMarkdown strips frontmatter, links, and emphasis', () => {
    const input = '---\ntitle: x\n---\n# H\n\nText with **bold** and [a link](https://example.com).';
    const { cleaned } = stripMarkdown(input);
    assert.ok(!cleaned.includes('title:'));
    assert.ok(!cleaned.includes('https://example.com'));
    assert.ok(cleaned.includes('bold'));
    assert.ok(cleaned.includes('a link'));
});

test('stripMarkdown reports no code block when none is present', () => {
    const { hasCodeBlock } = stripMarkdown('# H\n\nJust prose, no fences.');
    assert.equal(hasCodeBlock, false);
});

test('stripAsciidoc strips dashed code blocks and headings', () => {
    const input = '= Heading\n\nProse.\n\n----\ncode\n----\n\nMore.';
    const { cleaned, hasCodeBlock } = stripAsciidoc(input);
    assert.equal(hasCodeBlock, true);
    assert.ok(!cleaned.includes('code'));
    assert.ok(cleaned.includes('Prose.'));
});

test('stripAsciidoc strips emphasis markers', () => {
    const { cleaned } = stripAsciidoc('Text with *bold* and _italic_ words.');
    assert.ok(cleaned.includes('bold'));
    assert.ok(cleaned.includes('italic'));
    assert.ok(!cleaned.includes('*bold*'));
    assert.ok(!cleaned.includes('_italic_'));
});

test('countAcronyms counts 2+ uppercase letter runs', () => {
    assert.equal(countAcronyms('Using API and HTTP today'), 2);
    assert.equal(countAcronyms('No acronyms here'), 0);
    assert.equal(countAcronyms('USA NASA NATO'), 3);
    assert.equal(countAcronyms('A B C'), 0, 'single uppercase letters do not count');
});

test('formatHeader wraps markdown header in HTML comments', () => {
    const stats = {
        score: 70.5,
        rating: '8th & 9th grade - Plain English.',
        lineCount: 10,
        sentenceCount: 5,
        wordCount: 50,
        avgWordLength: 4.2,
        avgSyllables: 1.5,
        hasCodeBlock: false,
        acronymCount: 2,
    };
    const out = formatHeader(stats, 'markdown');
    assert.match(out, /^<!-- readability-score:start -->/);
    assert.ok(out.includes('<!-- readability-score:end -->'));
    assert.ok(out.includes('Readability score: 70.50'));
    assert.ok(!out.includes('// readability-score:start'));
});

test('formatHeader wraps asciidoc header in // comments', () => {
    const stats = {
        score: 70.5,
        rating: 'Plain English.',
        lineCount: 1,
        sentenceCount: 1,
        wordCount: 1,
        avgWordLength: 1,
        avgSyllables: 1,
        hasCodeBlock: true,
        acronymCount: 0,
    };
    const out = formatHeader(stats, 'asciidoc');
    assert.match(out, /^\/\/ readability-score:start/);
    assert.ok(out.includes('Code present: Yes'));
    assert.ok(!out.includes('<!--'));
});

test('parseArgs defaults', () => {
    const args = parseArgs(['node', 'readability.js']);
    assert.equal(args.folderPath, process.cwd());
    assert.equal(args.dryRun, false);
    assert.equal(args.help, false);
    assert.equal(args.version, false);
    assert.equal(args.whatsNew, false);
});

test('parseArgs positional path', () => {
    const args = parseArgs(['node', 'readability.js', './docs']);
    assert.equal(args.folderPath, './docs');
});

test('parseArgs --dry-run and -n', () => {
    assert.equal(parseArgs(['n', 's', '--dry-run']).dryRun, true);
    assert.equal(parseArgs(['n', 's', '-n']).dryRun, true);
});

test('parseArgs --version and -v', () => {
    assert.equal(parseArgs(['n', 's', '--version']).version, true);
    assert.equal(parseArgs(['n', 's', '-v']).version, true);
});

test('parseArgs --help and -h', () => {
    assert.equal(parseArgs(['n', 's', '--help']).help, true);
    assert.equal(parseArgs(['n', 's', '-h']).help, true);
});

test('parseArgs --whats-new, --release-notes, -rn all map to whatsNew', () => {
    assert.equal(parseArgs(['n', 's', '--whats-new']).whatsNew, true);
    assert.equal(parseArgs(['n', 's', '--release-notes']).whatsNew, true);
    assert.equal(parseArgs(['n', 's', '-rn']).whatsNew, true);
});

test('parseArgs combines flags with positional path', () => {
    const args = parseArgs(['n', 's', '--dry-run', './docs']);
    assert.equal(args.folderPath, './docs');
    assert.equal(args.dryRun, true);
});

test('printVersion prints "readability-ts v<version>"', () => {
    const out = captureStdout(printVersion);
    assert.equal(out, `readability-ts v${VERSION}`);
});

test('printHelp lists all flags', () => {
    const out = captureStdout(printHelp);
    assert.match(out, /Usage: readability-ts/);
    assert.match(out, /--dry-run/);
    assert.match(out, /--version/);
    assert.match(out, /--whats-new/);
    assert.match(out, /--release-notes/);
    assert.match(out, /--help/);
});

test('printWhatsNew prints release notes including version', () => {
    const out = captureStdout(printWhatsNew);
    assert.match(out, /What's new in readability-ts v/);
    assert.ok(out.includes(VERSION));
    if (HOMEPAGE) assert.ok(out.includes(HOMEPAGE));
});
