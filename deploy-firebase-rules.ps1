# Firebase Rules Deployment Script for CCRS
# This script deploys unified Firestore and Realtime Database rules from the root directory

Write-Host "🚀 Deploying Firebase Rules for CCRS..." -ForegroundColor Green

# Check if firebase CLI is installed
try {
    $firebaseVersion = firebase --version
    Write-Host "✅ Firebase CLI found: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

# Check if we're in the right directory
if (-not (Test-Path "firebase.json")) {
    Write-Host "❌ firebase.json not found. Please run this script from the CCRS root directory." -ForegroundColor Red
    exit 1
}

Write-Host "📝 Files to be deployed:" -ForegroundColor Cyan
Write-Host "  - firestore.rules (Unified Firestore rules for all 3 apps)" -ForegroundColor White  
Write-Host "  - firestore.indexes.json (Firestore indexes)" -ForegroundColor White
Write-Host "  - database.rules.json (Realtime Database rules for notifications)" -ForegroundColor White

# Confirm deployment
$confirmation = Read-Host "🤔 Deploy these rules to Firebase? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "❌ Deployment cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host "🔥 Deploying Firebase rules..." -ForegroundColor Yellow

try {
    # Deploy Firestore rules and indexes
    Write-Host "📤 Deploying Firestore rules and indexes..." -ForegroundColor Cyan
    firebase deploy --only firestore
    
    # Deploy Realtime Database rules  
    Write-Host "📤 Deploying Realtime Database rules..." -ForegroundColor Cyan
    firebase deploy --only database
    
    Write-Host "✅ Firebase rules deployed successfully!" -ForegroundColor Green
    Write-Host '🎉 All three apps (admin, police, newlogin) now use unified rules.' -ForegroundColor Green
    
} catch {
    Write-Host "❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Make sure you're logged in: firebase login" -ForegroundColor Yellow
    Write-Host '💡 Make sure you have selected the right project: firebase use <project-id>' -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🔍 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Test the rules by running your apps" -ForegroundColor White
Write-Host "  2. Verify permissions work correctly for all user roles" -ForegroundColor White  
Write-Host "  3. Check Firebase console for any rule evaluation errors" -ForegroundColor White
Write-Host ""
Write-Host "📚 Rule locations:" -ForegroundColor Cyan
Write-Host "  - Firestore: https://console.firebase.google.com/project/$(firebase use)/firestore/rules" -ForegroundColor White
Write-Host "  - Realtime DB: https://console.firebase.google.com/project/$(firebase use)/database/rules" -ForegroundColor White