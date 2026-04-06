#!/bin/bash
# Generates the RANDOM_BANNERS array for src/lib/constants.ts
# Run this after adding/removing banners from public/randombanners/
DIR="public/randombanners"
echo "export const RANDOM_BANNERS: string[] = ["
for f in "$DIR"/*.webp; do
    echo "    \"/randombanners/$(basename "$f")\","
done
echo "];"
echo ""
echo "// $(ls "$DIR"/*.webp | wc -l) banners"
