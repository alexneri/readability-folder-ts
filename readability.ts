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

// Remove AsciiDoc tags and code block formatting
function cleanAdocContent(content: string): string {
    return content.replace(/(```[\s\S]*?```|==+|--+|\.\.\.\.|\[.*?\])/g, '').trim();
}

// Recursively scan directory for .adoc files
async function scanDirectory(dirPath: string): Promise<string[]> {
    let adocFiles: string[] = [];

    const files = await fs.readdir(dirPath, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(dirPath, file.name);

        if (file.isDirectory()) {
            adocFiles = adocFiles.concat(await scanDirectory(fullPath));
        } else if (file.isFile() && file.name.endsWith('.adoc')) {
            adocFiles.push(fullPath);
        }
    }

    return adocFiles;
}

// Process each .adoc file
async function processAdocFile(filePath: string): Promise<{ filePath: string; score: number }> {
    const content = await fs.readFile(filePath, 'utf-8');

    // Clean up the content by removing AsciiDoc-specific tags and code blocks
    const cleanedContent = cleanAdocContent(content);

    // Compute readability score
    const score = fleschKincaid(cleanedContent);

    // Prepend the score as a comment at the top of the file
    const rating = getRating(score);

    const newContent = `// Readability score: ${score.toFixed(2)}: ${rating}\n\n${content}`;

    await fs.writeFile(filePath, newContent);

    return { filePath, score };
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
        // Recursively scan directory for .adoc files
        const adocFiles = await scanDirectory(folderPath);

        if (adocFiles.length === 0) {
            console.log('No .adoc files found.');
            process.exit(0);
        }

        let processedFilesCount = 0;
        let scoresSummary: string[] = [];

        for (const file of adocFiles) {
            const { filePath, score } = await processAdocFile(file);

            scoresSummary.push(`${filePath}: ${score.toFixed(2)}`);

            processedFilesCount++;
            displayProgressBar(processedFilesCount, adocFiles.length);
        }

        // Write scores summary to scores.txt in the top-level folder
        await fs.writeFile(path.join(folderPath, 'scores.txt'), scoresSummary.join('\n'));

        const endTime = performance.now();
        const totalTimeInSeconds = ((endTime - startTime) / 1000).toFixed(2);

        console.log(`\nReadability scores computed! Total files: ${processedFilesCount} processed in ${totalTimeInSeconds} seconds.`);
        console.log('Summary of scores are saved to scores.txt');

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();