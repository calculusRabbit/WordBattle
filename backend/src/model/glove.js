const fs = require('fs'); //file system read file
const path = require('path'); //to get the path of the file
const readline = require('readline'); //to read the file line by line

const wordToIdx = {};
const vectors = [];
let isLoaded = false;

function loadGlove() {
    return new Promise((resolve, reject) => {
        const filePath = path.join(__dirname, 'glove.6B.100d.txt');

        const rl = readline.createInterface({
            input: fs.createReadStream(filePath)
        });

        rl.on('line', (line) => {
            const parts = line.split(' ');
            const word = parts[0];
            const vector = parts.slice(1).map(Number);

            wordToIdx[word] = vectors.length;
            vectors.push(vector);
        });

        rl.on('close', () => {
            isLoaded = true;
            console.log(`Glove loaded successfully: ${vectors.length} words`);
            resolve();
        });

        rl.on('error', (err) => {
            reject(err);
        })
    });
}


function getVector(word) {
    const idx = wordToIdx[word.toLowerCase()];
    if (idx === undefined) {
        return null; // word not found
    }
    return vectors[idx];
}


function getSimilarity(word1, word2) {
    const vec1 = getVector(word1);
    const vec2 = getVector(word2);

    if (vec1 === null || vec2 === null) {
        return null; // one of the words not found
    }

    let dot = 0, norm1 = 0, norm2 = 0;
    for (let i = 0; i < vec1.length; i++) {
        dot += vec1[i] * vec2[i];
        norm1 += vec1[i] * vec1[i];
        norm2 += vec2[i] * vec2[i];
    }

    const score = dot / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return score;
}

module.exports = {
    loadGlove,
    getSimilarity,
    isLoaded
};