#!/bin/bash
# Simple HTTP server for Tableau Extension
# Run this script to serve the extension locally

echo "Starting local web server for Tableau Extension..."
echo "Extension will be available at: http://localhost:8000"
echo ""
echo "In Tableau Desktop:"
echo "1. Add Extension object to dashboard"
echo "2. Browse to DecompositionTree.trex"
echo "3. Extension will load from http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

cd "$(dirname "$0")"
python3 -m http.server 8000
