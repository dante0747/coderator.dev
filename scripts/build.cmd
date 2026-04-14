@echo off
set "NODE_HOME=C:\Program Files\nodejs"
set "PATH=%NODE_HOME%;%PATH%"
pushd "%~dp0.."
node build.js %*
popd
