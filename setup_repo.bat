@echo off
chcp 65001 >nul
set GIT="C:\Users\yekayacan\AppData\Local\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\cmd\git.exe"

echo [1/5] Git kullanici bilgileri ayarlaniyor...
%GIT% config user.name "yavuzkayacan"
%GIT% config user.email "yavuzkayacan@users.noreply.github.com"

echo [2/5] Ana dal 'main' olarak ayarlaniyor...
%GIT% branch -M main

echo [3/5] GitHub baglantisi ekleniyor...
%GIT% remote remove origin 2>nul
%GIT% remote add origin https://github.com/yavuzkayacan/hoca_ders.git

echo [4/5] Dosyalar ekleniyor ve commit olusturuluyor...
%GIT% add .
%GIT% commit -m "Istanbul 29 Mayis Universitesi Ders, Derslik ve Hoca Esletirme Sistemi"

echo [5/5] Git durumu:
%GIT% status
