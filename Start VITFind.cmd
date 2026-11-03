@echo off
cd /d "%~dp0"
echo Keep this window open while using VITFind.
echo When startup finishes, open the local address shown below.
node scripts/run-local.mjs
pause
