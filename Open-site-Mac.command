#!/bin/bash
# Локальний перегляд сайту на Mac. Подвійний клік по файлу.
cd "$(dirname "$0")" || exit 1
PORT=8080
while lsof -i :$PORT >/dev/null 2>&1; do PORT=$((PORT+1)); done
echo ""
echo "  Сайт:    http://localhost:$PORT/"
echo "  Адмінка: http://localhost:$PORT/admin/  (Chrome або Edge)"
echo "  Не закривайте це вікно, поки дивитесь сайт."
( sleep 1; open "http://localhost:$PORT/" ) &
python3 -m http.server $PORT --bind 127.0.0.1
