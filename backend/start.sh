#!/bin/sh

GLOVE_PATH="src/model/wiki_giga_2024_100_MFT20_vectors_seed_2024_alpha_0.75_eta_0.05.050_combined.txt"
WORDS_PATH="src/model/words_filtered.txt"

if [ ! -f "$GLOVE_PATH" ]; then
    echo "Downloading GloVe file..."
    wget -O "$GLOVE_PATH" "https://huggingface.co/datasets/calculusrabbit/wordduel-model/resolve/main/wiki_giga_2024_100_MFT20_vectors_seed_2024_alpha_0.75_eta_0.05.050_combined.txt"
fi

if [ ! -f "$WORDS_PATH" ]; then
    echo "Downloading filtered words..."
    wget -O "$WORDS_PATH" "https://drive.google.com/uc?export=download&id=1ljTniifH2sPA3SRmbgsDuCMqb5QC853D"
fi

exec node src/server.js