@echo off
echo ========================================
echo Co-Fleeter Vercel Deployment Script
echo ========================================
echo.

echo [1/4] Checking Git status...
git status
echo.

echo [2/4] Adding all files to Git...
git add .
echo.

echo [3/4] Committing changes...
set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg=Deploy to Vercel

git commit -m "%commit_msg%"
echo.

echo [4/4] Pushing to GitHub...
git push
echo.

echo ========================================
echo ✅ Code pushed to GitHub!
echo.
echo Next steps:
echo 1. Go to https://vercel.com
echo 2. Import your GitHub repository
echo 3. Set MONGO_URI environment variable
echo 4. Deploy!
echo.
echo Or use Vercel CLI:
echo   npm i -g vercel
echo   vercel
echo ========================================
pause

