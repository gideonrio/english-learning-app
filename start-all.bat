@echo off
echo ===================================================
echo 🚀 English Learning App - Universal Starter
echo ===================================================

:: Kill existing zombie processes to ensure app runs cleanly
echo Cleaning up existing processes...
taskkill /F /IM node.exe > nul 2>&1
taskkill /F /IM cloudflared.exe > nul 2>&1

echo.
echo Starting Local Next.js Server on Port 3000...
echo NOTE: -H 0.0.0.0 makes it accessible to ALL devices on your Wi-Fi!
start /B npx next dev -H 0.0.0.0 -p 3000 > server.log 2>&1

echo.
echo Waiting 5 seconds for the server to initialize...
timeout /t 5 /nobreak > nul

echo.
echo Starting Universal Cloudflare Link...
echo Your public link will appear below (look for .trycloudflare.com):
echo ---------------------------------------------------
npx -y cloudflared tunnel --url http://localhost:3000
pause
