#!/usr/bin/env node

import * as fs from 'fs/promises';
import * as path from 'path';
import { performance } from 'perf_hooks';

// Flesch-Kincaid readability score calculation
function fleschKincaid(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(Boolean).length;
    const words = text.split(/\s+/).filter(Boolean).length;
    const syllables = text.split(/\s+/).reduce((acc, word) => acc + countSyllables(word), 0);

    const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
    return Math.max(0, Math.min(100, score)); // Clamp score between 0 and 100
}

// Helper function to count syllables in a word
function countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1; // Treat short words as having one syllable

    const vowels = ['a', 'e', 'i', 'o', 'u', 'y'];
    let syllableCount = 0;
    let prevCharWasVowel = false;

    for (const char of word) {
        const isVowel = vowels.includes(char);
        if (isVowel && !prevCharWasVowel) {
            syllableCount++;
        }
        prevCharWasVowel = isVowel;
    }

    // Remove silent 'e'
    if (word.endsWith('e')) syllableCount--;

    return Math.max(1, syllableCount); // Ensure at least one syllable
}

// Rating system based on Flesch-Kincaid score
function getRating(score: number): string {
    if (score >= 100) return '5th grade level - Very easy to read. Easily understood by an average 11-year-old student.';
    if (score >= 90) return '6th grade level - Very easy to read. Easily understood by an average 11-year-old student.';
    if (score >= 80) return '7th grade level - Fairly easy to read.';
    if (score >= 70) return '8th & 9th grade - Plain English. Easily understood by 13- to 15-year-old students.';
    if (score >= 60) return '10th - 12th grade - Fairly difficult to read.';
    if (score >= 50) return 'College - Difficult to read.';
    if (score >= 30) return 'College grad - Very difficult to read. Best understood by university graduates.';
    return 'Professional - Extremely difficult to read. Best understood by university graduates.';
}

// Remove AsciiDoc/Markdown tags and code block formatting
function cleanContent(content: string): { cleanedText: string; hasCodeBlock: boolean } {
    const hasCodeBlock = /```[\s\S]*?```|----/.test(content); // Detect code blocks
    const cleanedText = content.replace(/(```[\s\S]*?```|==+|--+|\.\.\.\.|\[.*?\])/g, '').trim();
    return { cleanedText, hasCodeBlock };
}

// Count acronyms in the text
function countAcronyms(text: string): number {
    const acronymRegex = /\b[A-Z]{2,}\b/g; // Matches words with all uppercase letters of length >=2
    const matches = text.match(acronymRegex);
    return matches ? matches.length : 0;
}

// Recursively scan directory for .adoc and .md files
async function scanDirectory(dirPath: string): Promise<string[]> {
    let filesToProcess: string[] = [];

    const files = await fs.readdir(dirPath, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(dirPath, file.name);

        if (file.isDirectory()) {
            filesToProcess = filesToProcess.concat(await scanDirectory(fullPath));
        } else if (
            file.isFile() &&
            (file.name.endsWith('.adoc') || file.name.endsWith('.md'))
        ) {
            filesToProcess.push(fullPath);
        }
    }

    return filesToProcess;
}

// Process each file (.adoc or .md)
async function processFile(filePath: string): Promise<{
    filePath: string;
    score: number;
    lineCount: number;
    sentenceCount: number;
    wordCount: number;
    avgWordLength: number;
    avgSyllables: number;
    hasCodeBlock: boolean;
    acronymCount: number;
}> {
    const content = await fs.readFile(filePath, 'utf-8');

    // Clean up the content by removing AsciiDoc/Markdown-specific tags and code blocks
    const { cleanedText, hasCodeBlock } = cleanContent(content);

    // Compute readability score and rating
    const score = fleschKincaid(cleanedText);
    const rating = getRating(score);

    // Compute additional metrics
    const lines = content.split('\n');
    const lineCount = lines.length;

    const sentences = cleanedText.split(/[.!?]+/).filter(Boolean);
    const sentenceCount = sentences.length;

    const words = cleanedText.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    const avgWordLength =
        wordCount > 0 ? words.reduce((sum, word) => sum + word.length, 0) / wordCount : 0;

    const avgSyllables =
        wordCount > 0 ? words.reduce((sum, word) => sum + countSyllables(word), 0) / wordCount : 0;

    const acronymCount = countAcronyms(cleanedText);

    // Prepend the detailed metrics as comments at the top of the file.
    const newContent =
        `// Readability score: ${score.toFixed(2)}\n` +
        `// ${rating}\n` +
        `// File length: ${lineCount}, Sentence count: ${sentenceCount}, Word count: ${wordCount}, Average word length: ${avgWordLength.toFixed(
            2
        )}, Average syllables per word: ${avgSyllables.toFixed(
            2
        )}, Code present: ${hasCodeBlock ? 'Yes' : 'No'}, Acronyms: ${acronymCount}\n\n` +
        content;

    await fs.writeFile(filePath, newContent);

    return {
        filePath,
        score,
        lineCount,
        sentenceCount,
        wordCount,
        avgWordLength,
        avgSyllables,
        hasCodeBlock,
        acronymCount,
    };
}

// Display progress bar in console
function displayProgressBar(processed: number, total: number): void {
    const percentage = Math.floor((processed / total) * 100);

    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);

    process.stdout.write(`Progress: [${'='.repeat(percentage / 2)}${' '.repeat(50 - percentage / 2)}] ${percentage}%`);
}

// Main function to run the app
async function main() {
    const startTime = performance.now();

    // Get folder path from command-line arguments or use current working directory if not provided
    const folderPath = process.argv[2] || process.cwd();

    try {
        // Recursively scan directory for .adoc and .md files
        const filesToProcess = await scanDirectory(folderPath);

        if (filesToProcess.length === 0) {
            console.log('No .adoc or .md files found.');
            process.exit(0);
        }

        let processedFilesCount = 0;
        let scoresSummary: string[] = [];

        for (const file of filesToProcess) {
            const result = await processFile(file);

            scoresSummary.push(
                `${result.filePath}, Readability score: ${result.score.toFixed(
                    2
                )}, File length: ${result.lineCount}, Sentence count: ${
                    result.sentenceCount
                }, Word count: ${result.wordCount}, Average word length: ${result.avgWordLength.toFixed(
                    2
                )}, Average syllables per word: ${result.avgSyllables.toFixed(
                    2
                )}, Code present: ${result.hasCodeBlock ? 'Yes' : 'No'}, Acronyms: ${
                    result.acronymCount
                }`
            );

            processedFilesCount++;
            displayProgressBar(processedFilesCount, filesToProcess.length);
        }

        // Write scores summary to scores.txt in the top-level folder
        await fs.writeFile(path.join(folderPath, 'scores.txt'), scoresSummary.join('\n'));

        const endTime = performance.now();
        const totalTimeInSeconds = ((endTime - startTime) / 1000).toFixed(2);

        console.log(`\nReadability scores computed! Total files processed: ${processedFilesCount} in ${totalTimeInSeconds} seconds.`);
        console.log('Summary of scores saved to scores.txt');

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();