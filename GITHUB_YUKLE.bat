@echo off
chcp 65001 >nul
title GitHub Yukleme Araci - 29 Mayis Universitesi
cls
echo ================================================================
echo   ISTANBUL 29 MAYIS UNIVERSITESI - GITHUB YUKLEME ARACI
echo   Hedef Depo: https://github.com/yavuzkayacan/hoca_ders
echo ================================================================
echo.

set GIT=git
where git >nul 2>nul
if errorlevel 1 (
    set GIT="C:\Users\yekayacan\AppData\Local\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\cmd\git.exe"
)

echo [1/2] Proje dosyalari hazirlaniyor...
%GIT% add .
%GIT% commit -m "Istanbul 29 Mayis Universitesi Ders, Derslik ve Hoca Esletirme Sistemi" 2>nul

echo.
echo ================================================================
echo   GitHub'a aktarmak icin bir yontem seciniz:
echo ================================================================
echo   [1] Tarayici / Normal Giris ile Yukle
echo   [2] GitHub Personal Access Token (PAT) ile Yukle
echo   [3] Cikis
echo ================================================================
echo.
set /p SECIM="Seciminiz [1 veya 2]: "

if "%SECIM%"=="2" goto YONTEM_TOKEN
if "%SECIM%"=="3" exit /b 0

:YONTEM_NORMAL
echo.
echo [2/2] GitHub'a aktariliyor...
%GIT% push -u origin main --force
if errorlevel 1 (
    echo.
    echo ================================================================
    echo   [HATA] Yukleme basarisiz oldu!
    echo   Lutfen scripti tekrar calistirip [2] secenegini secin.
    echo ================================================================
    echo.
    pause
    exit /b 1
)
goto SONUC

:YONTEM_TOKEN
echo.
echo Token almak icin tarayicida şu adrese gidin:
echo https://github.com/settings/tokens
echo.
set /p GHTOKEN="GitHub Access Token'inizi yapistirin: "
if "%GHTOKEN%"=="" (
    echo Hata: Token bos birakilamaz!
    pause
    exit /b 1
)
echo.
echo [2/2] Token ile GitHub'a yukleniyor...
%GIT% push -f https://%GHTOKEN%@github.com/yavuzkayacan/hoca_ders.git main
if errorlevel 1 (
    echo.
    echo ================================================================
    echo   [HATA] Token ile yukleme de basarisiz oldu!
    echo   Lutfen Token'inizin dogru oldugunu kontrol edin.
    echo ================================================================
    echo.
    pause
    exit /b 1
)
goto SONUC

:SONUC
echo.
echo ================================================================
echo   TEBRIKLER! Dosyalar basariyla GitHub'a aktarildi.
echo   Deponuz: https://github.com/yavuzkayacan/hoca_ders
echo   Siteniz: https://yavuzkayacan.github.io/hoca_ders/
echo ================================================================
echo.
pause
