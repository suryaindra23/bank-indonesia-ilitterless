#!/bin/bash
cd "$(dirname "$0")" || exit 1
node --env-file-if-exists=.env scripts/create-dummy-accounts.js
echo
echo "Selesai. Tekan Enter untuk menutup."
read -r _
