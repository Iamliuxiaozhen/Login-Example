@echo off
setlocal

rem Generate and install a locally-trusted HTTPS certificate for Wrangler Pages dev.
rem This script:
rem   1. Requires mkcert (https://github.com/FiloSottile/mkcert).
rem   2. Installs mkcert's local CA into the system trust store (mkcert -install).
rem   3. Generates a certificate covering localhost, 127.0.0.1 and ::1.
rem   4. Saves it to .wrangler\certs\localhost.pem and .wrangler\certs\localhost-key.pem
rem      so wrangler pages dev can use --https-cert-path / --https-key-path.

rem Move to the repository root (one level above scripts\).
pushd "%~dp0.." >nul

set "CERT_DIR=.wrangler\certs"
set "CERT_FILE=%CERT_DIR%\localhost.pem"
set "KEY_FILE=%CERT_DIR%\localhost-key.pem"

where mkcert >nul 2>nul
if errorlevel 1 (
  echo error: mkcert is not installed.
  echo.
  echo Install it first, for example:
  echo   Windows:  choco install mkcert
  echo   macOS:    brew install mkcert
  echo   Ubuntu:   sudo apt install mkcert
  echo Then re-run this script.
  exit /b 1
)

if not exist "%CERT_DIR%" mkdir "%CERT_DIR%"

mkcert -install
if errorlevel 1 (
  echo.
  echo warning: failed to install mkcert's local CA into the system trust store.
  echo The certificate will still be generated, but browsers may show a trust warning.
)

mkcert -cert-file "%CERT_FILE%" -key-file "%KEY_FILE%" localhost 127.0.0.1 ::1
if errorlevel 1 (
  echo error: mkcert failed to generate the certificate.
  exit /b 1
)

echo.
echo Done. Local HTTPS certificate created at:
echo   cert: %CERT_FILE%
echo   key:  %KEY_FILE%
echo.
echo The project is now configured to run with:
echo   npm run dev
echo.
echo If you still see a browser certificate warning, close and reopen the browser
echo after running 'mkcert -install' ^(Firefox may need a full browser restart^).

popd >nul
endlocal
