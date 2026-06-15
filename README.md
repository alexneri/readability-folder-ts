# Readability Score Tester (Folder)
A CLI app that runs the Flesch-Kincaid readability score recursively on AsciiDoc and Markdown files in a folder.

## Overview

This tool scans a folder for documentation files, strips out code blocks and formatting, and computes a Flesch-Kincaid readability score. The higher the score, the easier the document is to read.

Supported file types: `.adoc`, `.asciidoc`, `.md`, `.markdown`, `.mdx`.

## Flow

1. Recursively scan the folder (skipping `node_modules`, `.git`, `dist`, `build`, `coverage`, `.idea`, `.vscode`, and similar build/tooling directories).
2. For every supported file, analyse the content:
   1. Strip any header block the tool previously inserted (so re-runs do not stack headers).
   2. Strip format-specific syntax: code blocks, headings, lists, emphasis, links, frontmatter, HTML, tables, etc.
   3. Compute the Flesch-Kincaid readability score on the cleaned text.
   4. Prepend a header block in the format native to the file:
      * AsciiDoc files get `//` line comments.
      * Markdown files get `<!-- ... -->` HTML comments.
   5. Rating system:
      * 90-100: 5th-6th grade level - Very easy to read.
      * 80-89: 7th grade level - Fairly easy to read.
      * 70-79: 8th & 9th grade - Plain English.
      * 60-69: 10th-12th grade - Fairly difficult to read.
      * 50-59: College - Difficult to read.
      * 30-49: College grad - Very difficult to read.
      * 0-29: Professional - Extremely difficult to read.
3. Write a summary of all files and scores to `scores.txt` in the top-level folder.
4. Display a progress bar while running (when stdout is a TTY).
5. On completion, print: `Readability scores computed! Total files processed: <n> in <t> seconds.`

Files are processed concurrently (8 at a time) for speed.

## Installation

There are two ways for you to install this tool:

### Install via npm (Recommended)

1. Run `npm install @alexneri/readability-ts -g`.

### via this CLI

1. Clone the repository: `git clone git@github.com:alexneri/readability-folder-ts.git` 
2. Open terminal.
3. Navigate to the folder. 
4. Run `npm install` to install the dependencies.
5. Run `npm link`

## Usage

```
readability-ts [path] [options]
```

* `path` — folder to scan (defaults to the current working directory).
* `-n`, `--dry-run` — compute scores without modifying any files or writing `scores.txt`.
* `-v`, `--version` — print the installed version and exit.
* `-rn`, `--whats-new`, `--release-notes` — print release notes for the current version and exit.
* `-h`, `--help` — show usage.

### Examples

```
readability-ts                 # scan the current folder
readability-ts ./docs          # scan a specific folder
readability-ts ./docs -n       # preview scores without writing anything
readability-ts --version       # print the installed version
readability-ts --whats-new     # print release notes for the current version
readability-ts --help          # print usage
```

### Re-running

Headers are wrapped in `readability-score:start` / `readability-score:end` sentinels, so re-running the tool replaces the existing header in place rather than stacking new ones. Files written by older (pre-0.9) versions of the tool are also detected and migrated on the next run.

## License
```GNU License

This program is free software licensed under GNU GPL v3 or later.

You have the freedom to:
- Use this program for any purpose
- Study and modify the source code
- Share the program with others
- Share your modifications with others

If you share this program or any modifications:
- You must provide the source code
- You must license it under GNU GPL v3
- You must preserve copyright notices

This program comes with no warranty.

For the full license text see: GNU GPL v3
```

A donation is not required, but it is appreciated. If you find this program useful, please consider [sponsoring](https://github.com/sponsors/alexneri) me :) 

## Development

Run the test suite (Node 18+; no extra devDependencies required):

```
npm test
```

Tests live in `test/` and use Node's built-in `node:test` runner. They
cover both the pure scoring/parsing functions and the CLI flags via
child-process integration tests.

## Roadmap

* ~~Make this installable on npm~~ **DONE**
* ~~Add Markdown support with proper comment syntax~~ **DONE**
* ~~Idempotent re-runs~~ **DONE**
* ~~Skip vendored/build directories by default~~ **DONE**
* ~~Add a basic test suite~~ **DONE**
* Add more tests
* Add more documentation
* Add more supported file formats
* Add more supported languages
* Add more supported readability tests

For feature requests, please open an [issue](https://github.com/alexneri/readability-folder-ts/issues) on the repository.

## For further reading

* Wikipedia Article: https://en.wikipedia.org/wiki/Flesch%E2%80%93Kincaid_readability_tests
* Research Paper: https://psycnet.apa.org/doiLanding?doi=10.1037%2Fh0057532
