# Readability Score Tester (Folder)
A CLI app that runs the Flesch-kincaid readability score recursively on all `*.adoc` files in the current directory.

## Overview

This is a javascript app that scans a folder for your files, filters out code and formatting, and generates a readability score based on Flesch-Kincaid tests. The higher the score, the easier it is to read and understand your document.

## Flow

This application does the following:

1. Recursively scan the entire folder
2. For every `*.adoc` file, analyse the content:
   1. Copy the contents 
   2. Remove code block formatting and any asciidoc-related tags (e.g. `==`, `===`, `----`, `....`, etc.)
   3. Compute the flesch-kincaid readabilty score of the contents 
   4. Prepend the score to the file as a comment in the following template:
        `// Readability score: <score>: <rating>`
      * For the rating, use the following system for ratings:
        * Score is 91-100 - Very easy to read. Easily understood by an average 11-year-old student.' 
        * Score is 81-90 - '6th grade level - Very easy to read. Easily understood by an average 11-year-old student' 
        * Score is 71-80 - '7th grade level - Fairly easy to read.' 
        * Score is 61-70-  '8th & 9th grade - Plain English. Easily understood by 13- to 15-year-old students.' 
        * Score is 51-60 - '10th - 12th grade - Fairly difficult to read.' 
        * Score is 41-50 - 'College - Difficult to read.' 
        * Score is 31-40 'College grad - Very difficult to read. Best understood by university graduates.' 
        * Score is 0-30 'Professional - Extremely difficult to read. Best understood by university graduates.'
3. Save the list of files (include the directory tree from the top-level folder where the command is run) and their readability scores to a file called `scores.txt` in the same top-level folder the command is run.
4. While the application is running, display a progress bar that shows the percentage of files processed.
4. After the command is complete, display the following message:
   `Readability scores computed! Total files: <total files> processed in <total time>. Summary of scores are saved to scores.txt`

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

Enter command `readability-ts /path/to/folder` and replace the path with the folder you want to scan (relative to the folder you run this command).

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

## Roadmap

* ~~Make this installable on npm~~ **DONE**
* Add more tests
* Add more documentation
* Add more supported file formats
* Add more supported languages
* Add more supported readability tests

For feature requests, please open an [issue](https://github.com/alexneri/readability-folder-ts/issues) on the repository.

## For further reading

* Wikipedia Article: https://en.wikipedia.org/wiki/Flesch%E2%80%93Kincaid_readability_tests
* Research Paper: https://psycnet.apa.org/doiLanding?doi=10.1037%2Fh0057532