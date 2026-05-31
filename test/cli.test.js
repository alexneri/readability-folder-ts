'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CLI = path.join(__dirname, '..', 'readability.js');
const pkg = require('../package.json');

function run(args, opts = {}) {
    return spawnSync(process.execPath, [CLI, ...args], {
        encoding: 'utf-8',
        ...opts,
    });
}

function mkTempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'readability-test-'));
}

test('--version prints "readability-ts v<version>" and exits 0', () => {
    const r = run(['--version']);
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), `readability-ts v${pkg.version}`);
});

test('-v has the same output as --version', () => {
    assert.equal(run(['-v']).stdout, run(['--version']).stdout);
});

test('--help prints usage and lists all flags', () => {
    const r = run(['--help']);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Usage: readability-ts/);
    for (const flag of ['--dry-run', '--version', '--whats-new', '--release-notes', '--help']) {
        assert.ok(r.stdout.includes(flag), `help output missing ${flag}`);
    }
});

test('-h has the same output as --help', () => {
    assert.equal(run(['-h']).stdout, run(['--help']).stdout);
});

test('--whats-new prints release notes and homepage', () => {
    const r = run(['--whats-new']);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /What's new in readability-ts v/);
    assert.ok(r.stdout.includes(pkg.version));
    if (pkg.homepage) assert.ok(r.stdout.includes(pkg.homepage));
});

test('--release-notes and -rn match --whats-new', () => {
    const baseline = run(['--whats-new']).stdout;
    assert.equal(run(['--release-notes']).stdout, baseline);
    assert.equal(run(['-rn']).stdout, baseline);
});

test('--dry-run on a temp folder computes scores without writing scores.txt or modifying files', () => {
    const dir = mkTempDir();
    try {
        const sample = '# Title\n\nThis is some sample prose used to compute a readability score.\n';
        const file = path.join(dir, 'sample.md');
        fs.writeFileSync(file, sample);

        const r = run([dir, '--dry-run']);
        assert.equal(r.status, 0);
        assert.match(r.stdout, /dry-run: no files were modified/);

        assert.ok(!fs.existsSync(path.join(dir, 'scores.txt')), 'scores.txt should not be written');
        assert.equal(fs.readFileSync(file, 'utf-8'), sample, 'source file should be unchanged');
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('default run writes scores.txt and prepends a per-file header', () => {
    const dir = mkTempDir();
    try {
        const sample = '# Title\n\nThis is some sample prose used to compute a readability score.\n';
        const file = path.join(dir, 'sample.md');
        fs.writeFileSync(file, sample);

        const r = run([dir]);
        assert.equal(r.status, 0);
        assert.ok(fs.existsSync(path.join(dir, 'scores.txt')), 'scores.txt should be written');

        const updated = fs.readFileSync(file, 'utf-8');
        assert.match(updated, /<!-- readability-score:start -->/);
        assert.match(updated, /<!-- readability-score:end -->/);
        assert.ok(updated.endsWith(sample), 'original content should be preserved after the header');
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('re-running on the same folder does not stack headers', () => {
    const dir = mkTempDir();
    try {
        const sample = '# Title\n\nThis is sample prose for an idempotency test.\n';
        const file = path.join(dir, 'sample.md');
        fs.writeFileSync(file, sample);

        run([dir]);
        run([dir]);
        const updated = fs.readFileSync(file, 'utf-8');
        const startMatches = updated.match(/readability-score:start/g) || [];
        assert.equal(startMatches.length, 1, 'should have exactly one start sentinel');
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('exits 0 with a friendly message when no supported files are found', () => {
    const dir = mkTempDir();
    try {
        fs.writeFileSync(path.join(dir, 'not-supported.txt'), 'hi');
        const r = run([dir]);
        assert.equal(r.status, 0);
        assert.match(r.stdout, /No supported files found/);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
