@echo off
chcp 65001 >nul
title GitHub Yükleme Aracı - 29 Mayıs Üniversitesi
cls
echo ================================================================
echo   İSTANBUL 29 MAYIS ÜNİVERSİTESİ - GITHUB YÜKLEME ARACI
echo   Hedef Depo: https://github.com/yavuzkayacan/hoca_ders
echo ================================================================
echo.

set GIT="C:\Users\yekayacan\AppData\Local\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\cmd\git.exe"

echo [1/2] Proje dosyalari hazirlaniyor...
%GIT% add .
%GIT% commit -m "Istanbul 29 Mayis Universitesi Ders, Derslik ve Hoca Esletirme Sistemi" 2>nul

echo.
echo ================================================================
echo   GitHub'a aktarmak için bir yöntem seçiniz:
echo ================================================================
echo   [1] Tarayici ile Yetkilendirerek Yükle (Enter'a basabilirsiniz)
echo   [2] GitHub Personal Access Token (PAT) ile Yükle
echo   [3] Çikis
echo ================================================================
echo.
set /p SECIM="Seçiminiz [Varsayilan: 1]: "

if "%SECIM%"=="" set SECIM=1

if "%SECIM%"=="1" (
    echo.
    echo [2/2] GitHub'a aktariliyor...
    echo (Eger tarayici veya yetkilendirme penceresi acilirsa lutfen onaylayin)
    %GIT% push -u origin main
    goto SONUC
)

if "%SECIM%"=="2" (
    echo.
    echo Token olusturmak icin: https://github.com/settings/tokens
    set /p GHTOKEN="GitHub Access Token'inizi yapistirin: "
    if "%GHTOKEN%"=="" (
        echo Hata: Token bos birakilamaz!
        goto SONUC
    )
    echo.
    echo [2/2] Token ile GitHub'a yukleniyor...
    %GIT% push https://%GHTOKEN%@github.com/yavuzkayacan/hoca_ders.git main
    goto SONUC
)

:SONUC
echo.
echo ================================================================
echo   İşlem tamamlandı!
echo   Deponuzu kontrol etmek için:
echo   https://github.com/yavuzkayacan/hoca_ders
echo ================================================================
echo.
pause
