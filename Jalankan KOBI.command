#!/bin/bash
cd "$(dirname "$0")"
echo "Menghentikan server COBI lama (port 5173 & 3001)..."
lsof -ti tcp:5173 -ti tcp:3001 2>/dev/null | xargs kill 2>/dev/null
sleep 1
mkdir -p data
echo "Menjalankan COBI di http://127.0.0.1:5173 (log: data/dev.log). Tutup jendela ini untuk berhenti."
npm run dev 2>&1 | tee data/dev.log
