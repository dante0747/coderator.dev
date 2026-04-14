@echo off
:: Ensure Node.js is on PATH (handles terminals opened before Node was installed)
set "NODE_HOME=C:\Program Files\nodejs"
set "PATH=%NODE_HOME%;%PATH%"
pushd "%~dp0.."
echo Building site...
node build.js
echo.
echo Starting server at http://localhost:3000
node serve.js
popd
