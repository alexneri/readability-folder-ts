#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs/promises");
var path = require("path");
var perf_hooks_1 = require("perf_hooks");
// Flesch-Kincaid readability score calculation
function fleschKincaid(text) {
    var sentences = text.split(/[.!?]+/).filter(Boolean).length;
    var words = text.split(/\s+/).filter(Boolean).length;
    var syllables = text.split(/\s+/).reduce(function (acc, word) { return acc + countSyllables(word); }, 0);
    var score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
    return Math.max(0, Math.min(100, score)); // Clamp score between 0 and 100
}
// Helper function to count syllables in a word
function countSyllables(word) {
    word = word.toLowerCase();
    if (word.length <= 3)
        return 1; // Treat short words as having one syllable
    var vowels = ['a', 'e', 'i', 'o', 'u', 'y'];
    var syllableCount = 0;
    var prevCharWasVowel = false;
    for (var _i = 0, word_1 = word; _i < word_1.length; _i++) {
        var char = word_1[_i];
        var isVowel = vowels.includes(char);
        if (isVowel && !prevCharWasVowel) {
            syllableCount++;
        }
        prevCharWasVowel = isVowel;
    }
    // Remove silent 'e'
    if (word.endsWith('e'))
        syllableCount--;
    return Math.max(1, syllableCount); // Ensure at least one syllable
}
// Rating system based on Flesch-Kincaid score
function getRating(score) {
    if (score >= 100)
        return '5th grade level - Very easy to read. Easily understood by an average 11-year-old student.';
    if (score >= 90)
        return '6th grade level - Very easy to read. Easily understood by an average 11-year-old student.';
    if (score >= 80)
        return '7th grade level - Fairly easy to read.';
    if (score >= 70)
        return '8th & 9th grade - Plain English. Easily understood by 13- to 15-year-old students.';
    if (score >= 60)
        return '10th - 12th grade - Fairly difficult to read.';
    if (score >= 50)
        return 'College - Difficult to read.';
    if (score >= 30)
        return 'College grad - Very difficult to read. Best understood by university graduates.';
    return 'Professional - Extremely difficult to read. Best understood by university graduates.';
}
// Remove AsciiDoc/Markdown tags and code block formatting
function cleanContent(content) {
    var hasCodeBlock = /```[\s\S]*?```|----/.test(content); // Detect code blocks
    var cleanedText = content.replace(/(```[\s\S]*?```|==+|--+|\.\.\.\.|\[.*?\])/g, '').trim();
    return { cleanedText: cleanedText, hasCodeBlock: hasCodeBlock };
}
// Count acronyms in the text
function countAcronyms(text) {
    var acronymRegex = /\b[A-Z]{2,}\b/g; // Matches words with all uppercase letters of length >=2
    var matches = text.match(acronymRegex);
    return matches ? matches.length : 0;
}
// Recursively scan directory for .adoc and .md files
function scanDirectory(dirPath) {
    return __awaiter(this, void 0, void 0, function () {
        var filesToProcess, files, _i, files_1, file, fullPath, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    filesToProcess = [];
                    return [4 /*yield*/, fs.readdir(dirPath, { withFileTypes: true })];
                case 1:
                    files = _c.sent();
                    _i = 0, files_1 = files;
                    _c.label = 2;
                case 2:
                    if (!(_i < files_1.length)) return [3 /*break*/, 6];
                    file = files_1[_i];
                    fullPath = path.join(dirPath, file.name);
                    if (!file.isDirectory()) return [3 /*break*/, 4];
                    _b = (_a = filesToProcess).concat;
                    return [4 /*yield*/, scanDirectory(fullPath)];
                case 3:
                    filesToProcess = _b.apply(_a, [_c.sent()]);
                    return [3 /*break*/, 5];
                case 4:
                    if (file.isFile() &&
                        (file.name.endsWith('.adoc') || file.name.endsWith('.md'))) {
                        filesToProcess.push(fullPath);
                    }
                    _c.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 2];
                case 6: return [2 /*return*/, filesToProcess];
            }
        });
    });
}
// Process each file (.adoc or .md)
function processFile(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var content, _a, cleanedText, hasCodeBlock, score, rating, lines, lineCount, sentences, sentenceCount, words, wordCount, avgWordLength, avgSyllables, acronymCount, newContent;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, fs.readFile(filePath, 'utf-8')];
                case 1:
                    content = _b.sent();
                    _a = cleanContent(content), cleanedText = _a.cleanedText, hasCodeBlock = _a.hasCodeBlock;
                    score = fleschKincaid(cleanedText);
                    rating = getRating(score);
                    lines = content.split('\n');
                    lineCount = lines.length;
                    sentences = cleanedText.split(/[.!?]+/).filter(Boolean);
                    sentenceCount = sentences.length;
                    words = cleanedText.split(/\s+/).filter(Boolean);
                    wordCount = words.length;
                    avgWordLength = wordCount > 0 ? words.reduce(function (sum, word) { return sum + word.length; }, 0) / wordCount : 0;
                    avgSyllables = wordCount > 0 ? words.reduce(function (sum, word) { return sum + countSyllables(word); }, 0) / wordCount : 0;
                    acronymCount = countAcronyms(cleanedText);
                    newContent = "// Readability score: ".concat(score.toFixed(2), "\n") +
                        "// ".concat(rating, "\n") +
                        "// File length: ".concat(lineCount, ", Sentence count: ").concat(sentenceCount, ", Word count: ").concat(wordCount, ", Average word length: ").concat(avgWordLength.toFixed(2), ", Average syllables per word: ").concat(avgSyllables.toFixed(2), ", Code present: ").concat(hasCodeBlock ? 'Yes' : 'No', ", Acronyms: ").concat(acronymCount, "\n\n") +
                        content;
                    return [4 /*yield*/, fs.writeFile(filePath, newContent)];
                case 2:
                    _b.sent();
                    return [2 /*return*/, {
                            filePath: filePath,
                            score: score,
                            lineCount: lineCount,
                            sentenceCount: sentenceCount,
                            wordCount: wordCount,
                            avgWordLength: avgWordLength,
                            avgSyllables: avgSyllables,
                            hasCodeBlock: hasCodeBlock,
                            acronymCount: acronymCount,
                        }];
            }
        });
    });
}
// Display progress bar in console
function displayProgressBar(processed, total) {
    var percentage = Math.floor((processed / total) * 100);
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write("Progress: [".concat('='.repeat(percentage / 2)).concat(' '.repeat(50 - percentage / 2), "] ").concat(percentage, "%"));
}
// Main function to run the app
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, folderPath, filesToProcess, processedFilesCount, scoresSummary, _i, filesToProcess_1, file, result, endTime, totalTimeInSeconds, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = perf_hooks_1.performance.now();
                    folderPath = process.argv[2] || process.cwd();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 8, , 9]);
                    return [4 /*yield*/, scanDirectory(folderPath)];
                case 2:
                    filesToProcess = _a.sent();
                    if (filesToProcess.length === 0) {
                        console.log('No .adoc or .md files found.');
                        process.exit(0);
                    }
                    processedFilesCount = 0;
                    scoresSummary = [];
                    _i = 0, filesToProcess_1 = filesToProcess;
                    _a.label = 3;
                case 3:
                    if (!(_i < filesToProcess_1.length)) return [3 /*break*/, 6];
                    file = filesToProcess_1[_i];
                    return [4 /*yield*/, processFile(file)];
                case 4:
                    result = _a.sent();
                    scoresSummary.push("".concat(result.filePath, ", Readability score: ").concat(result.score.toFixed(2), ", File length: ").concat(result.lineCount, ", Sentence count: ").concat(result.sentenceCount, ", Word count: ").concat(result.wordCount, ", Average word length: ").concat(result.avgWordLength.toFixed(2), ", Average syllables per word: ").concat(result.avgSyllables.toFixed(2), ", Code present: ").concat(result.hasCodeBlock ? 'Yes' : 'No', ", Acronyms: ").concat(result.acronymCount));
                    processedFilesCount++;
                    displayProgressBar(processedFilesCount, filesToProcess.length);
                    _a.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6: 
                // Write scores summary to scores.txt in the top-level folder
                return [4 /*yield*/, fs.writeFile(path.join(folderPath, 'scores.txt'), scoresSummary.join('\n'))];
                case 7:
                    // Write scores summary to scores.txt in the top-level folder
                    _a.sent();
                    endTime = perf_hooks_1.performance.now();
                    totalTimeInSeconds = ((endTime - startTime) / 1000).toFixed(2);
                    console.log("\nReadability scores computed! Total files processed: ".concat(processedFilesCount, " in ").concat(totalTimeInSeconds, " seconds."));
                    console.log('Summary of scores saved to scores.txt');
                    return [3 /*break*/, 9];
                case 8:
                    error_1 = _a.sent();
                    console.error('Error:', error_1.message);
                    process.exit(1);
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    });
}
main();
