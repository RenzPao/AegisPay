@echo off
setlocal EnableDelayedExpansion

:: Set the output folder
set "OUTPUT_DIR=payroll csv tests"

:: Create the directory if it doesn't exist
if not exist "%OUTPUT_DIR%" (
    mkdir "%OUTPUT_DIR%"
)

:: Generate a unique filename using the current date and time
set "TIMESTAMP=%date:~10,4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"
set "FILENAME=%OUTPUT_DIR%\payroll_batch_%TIMESTAMP%.csv"

:: Create the CSV header
echo workerId,wageAmountUSD > "%FILENAME%"

:: Generate between 5 and 15 random rows
set /a num_rows=(%RANDOM% %% 11) + 5

echo Generating %num_rows% rows into %FILENAME%...

:: Use PowerShell to generate a random UUID and a random USD amount (between $500 and $5000) for each row
for /l %%i in (1, 1, %num_rows%) do (
    for /f "usebackq tokens=*" %%a in (`powershell -NoProfile -Command "[guid]::NewGuid().ToString().Substring(0,8).ToUpper()"`) do set "workerId=EMP-%%a"
    for /f "usebackq tokens=*" %%b in (`powershell -NoProfile -Command "$amount = (Get-Random -Minimum 500 -Maximum 5000) + ([math]::Round((Get-Random -Minimum 0.0 -Maximum 1.0), 2)); '{0:F2}' -f $amount"`) do set "wageAmount=%%b"
    
    echo !workerId!,!wageAmount! >> "%FILENAME%"
)

echo.
echo Done! Created test CSV at:
echo %cd%\%FILENAME%
echo.
timeout /t 5
