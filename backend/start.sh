#!/bin/sh

GLOVE_PATH="src/model/glove.6B.100d.txt"
WORDS_PATH="src/model/words_filtered.txt"

if [ ! -f "$GLOVE_PATH" ]; then
    echo "Downloading GloVe file..."
    wget -O "$GLOVE_PATH" "https://huggingface.co/datasets/calculusrabbit/wordduel-model/resolve/main/glove.6B.100d.txt"
fi

if [ ! -f "$WORDS_PATH" ]; then
    echo "Downloading filtered words..."
    wget -O "$WORDS_PATH" "https://huggingface.co/datasets/calculusrabbit/wordduel-model/resolve/main/words_filtered.txt"
fi

exec node src/server.js