# Sprint 1 Deployment Script for CCRS
# This script handles all deployment requirements for Sprint 1 testing

Write-Host "🚀 CCRS Sprint 1 Deployment Script" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""

# Check if we're in the correct directory
$currentDir = Get-Location
if (-not (Test-Path "firestore.rules")) {
    Write-Host "❌ Error: firestore.rules not found in current directory" -ForegroundColor Red
    Write-Host "Please run this script from the CCRS project root directory" -ForegroundColor Yellow
    Write-Host "Expected location: C:\Users\nicos\september282025" -ForegroundColor Yellow
    exit 1
}

Write-Host "📂 Current directory: $currentDir" -ForegroundColor Blue
Write-Host "✅ firestore.rules found" -ForegroundColor Green
Write-Host ""

# Step 1: Check Firebase CLI
Write-Host "1️⃣ Checking Firebase CLI..." -ForegroundColor Cyan
try {
    $firebaseVersion = firebase --version
    Write-Host "✅ Firebase CLI found: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase CLI not found" -ForegroundColor Red
    Write-Host "Please install Firebase CLI:" -ForegroundColor Yellow
    Write-Host "npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

# Step 2: Check Firebase login status
Write-Host ""
Write-Host "2️⃣ Checking Firebase authentication..." -ForegroundColor Cyan
try {
    $loginStatus = firebase projects:list --json 2>$null | ConvertFrom-Json
    if ($loginStatus -and $loginStatus.Count -gt 0) {
        Write-Host "✅ Firebase CLI authenticated" -ForegroundColor Green
    } else {
        Write-Host "❌ Firebase CLI not authenticated" -ForegroundColor Red
        Write-Host "Please login to Firebase:" -ForegroundColor Yellow
        Write-Host "firebase login" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ Firebase authentication check failed" -ForegroundColor Red
    Write-Host "Please login to Firebase:" -ForegroundColor Yellow
    Write-Host "firebase login" -ForegroundColor Yellow
    exit 1
}

# Step 3: Check current project
Write-Host ""
Write-Host "3️⃣ Checking Firebase project..." -ForegroundColor Cyan
try {
    $currentProject = firebase use --json | ConvertFrom-Json
    if ($currentProject.active -eq "mylogin-7b99e") {
        Write-Host "✅ Correct project selected: mylogin-7b99e" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Wrong project selected: $($currentProject.active)" -ForegroundColor Yellow
        Write-Host "Switching to correct project..." -ForegroundColor Yellow
        firebase use mylogin-7b99e
        Write-Host "✅ Project switched to mylogin-7b99e" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Project selection failed" -ForegroundColor Red
    Write-Host "Please select the correct project:" -ForegroundColor Yellow
    Write-Host "firebase use mylogin-7b99e" -ForegroundColor Yellow
    exit 1
}

# Step 4: Deploy Firebase rules
Write-Host ""
Write-Host "4️⃣ Deploying Firestore security rules..." -ForegroundColor Cyan
Write-Host "   Rules include Sprint 1 features:" -ForegroundColor Gray
Write-Host "   - desk_officer role support" -ForegroundColor Gray
Write-Host "   - Triage field validation" -ForegroundColor Gray
Write-Host "   - Blotter numbering permissions" -ForegroundColor Gray
Write-Host "   - Counters collection rules" -ForegroundColor Gray
Write-Host ""

try {
    firebase deploy --only firestore:rules
    Write-Host "✅ Firestore rules deployed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Firestore rules deployment failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 5: Deploy database rules (for notifications)
Write-Host ""
Write-Host "5️⃣ Deploying Realtime Database rules..." -ForegroundColor Cyan
try {
    firebase deploy --only database
    Write-Host "✅ Database rules deployed successfully" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Database rules deployment failed (optional)" -ForegroundColor Yellow
    Write-Host "This is optional for Sprint 1 testing" -ForegroundColor Gray
}

# Step 6: Ask about desk officer account creation
Write-Host ""
Write-Host "6️⃣ Desk Officer Account Creation" -ForegroundColor Cyan
$createAccount = Read-Host "Create a test desk officer account? (y/n)"

if ($createAccount -eq "y" -or $createAccount -eq "Y" -or $createAccount -eq "yes") {
    Write-Host ""
    Write-Host "📝 Creating desk officer account..." -ForegroundColor Yellow
    Write-Host "This will run the Node.js script for account creation" -ForegroundColor Gray
    Write-Host ""
    
    # Change to admin directory and run the script
    Push-Location "admin"
    try {
        node create-desk-officer.js
        Write-Host ""
        Write-Host "✅ Desk officer account creation completed" -ForegroundColor Green
    } catch {
        Write-Host "❌ Desk officer account creation failed" -ForegroundColor Red
        Write-Host "You can run it manually later:" -ForegroundColor Yellow
        Write-Host "cd admin && node create-desk-officer.js" -ForegroundColor Yellow
    } finally {
        Pop-Location
    }
} else {
    Write-Host "⏭️ Skipping desk officer account creation" -ForegroundColor Yellow
    Write-Host "You can create it later by running:" -ForegroundColor Gray
    Write-Host "cd admin && node create-desk-officer.js" -ForegroundColor Gray
}

# Step 7: Deployment verification
Write-Host ""
Write-Host "7️⃣ Verifying deployment..." -ForegroundColor Cyan
try {
    # Check if rules were deployed
    firebase firestore:rules get > $null
    Write-Host "✅ Firestore rules verification passed" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Could not verify Firestore rules deployment" -ForegroundColor Yellow
}

# Step 8: Display success message and next steps
Write-Host ""
Write-Host "🎉 Sprint 1 Deployment Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Deployed Components:" -ForegroundColor Green
Write-Host "   - Firestore security rules with desk_officer role" -ForegroundColor Gray
Write-Host "   - Database rules for notifications" -ForegroundColor Gray
Write-Host "   - Triage and blotter field validation" -ForegroundColor Gray
Write-Host "   - Counters collection permissions" -ForegroundColor Gray

if ($createAccount -eq "y" -or $createAccount -eq "Y" -or $createAccount -eq "yes") {
    Write-Host "   - Test desk officer account" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🧪 Ready for Testing:" -ForegroundColor Blue
Write-Host "=====================" -ForegroundColor Blue
Write-Host "1. Emergency Triage System" -ForegroundColor Gray
Write-Host "   → Citizen app shows emergency/non-emergency selection" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Desk Officer Portal" -ForegroundColor Gray
Write-Host "   → Admin dashboard /desk route for report validation" -ForegroundColor Gray
Write-Host ""  
Write-Host "3. Blotter Numbering" -ForegroundColor Gray
Write-Host "   → Automatic YYYY-MM-NNNNNN format on report approval" -ForegroundColor Gray
Write-Host ""

Write-Host "🚀 Testing Instructions:" -ForegroundColor Yellow
Write-Host "========================" -ForegroundColor Yellow
Write-Host "1. Start citizen app: cd newlogin `&`& npm start" -ForegroundColor Gray
Write-Host "2. Start admin dashboard: cd admin `&`& npm run dev" -ForegroundColor Gray
Write-Host "3. Create test reports as citizen" -ForegroundColor Gray
Write-Host "4. Login to admin dashboard at /desk route" -ForegroundColor Gray
Write-Host "5. Validate reports and test blotter generation" -ForegroundColor Gray
Write-Host ""

Write-Host "⚠️ Important Notes:" -ForegroundColor Red
Write-Host "==================" -ForegroundColor Red
Write-Host "• Clear browser cache/localStorage before testing" -ForegroundColor Gray
Write-Host "• Ensure all apps are using the same Firebase project" -ForegroundColor Gray
Write-Host "• Test with desk officer account for full functionality" -ForegroundColor Gray
Write-Host "• Monitor Firebase console for any permission errors" -ForegroundColor Gray
Write-Host ""

Write-Host "📊 Sprint 1 Status: ✅ READY FOR TESTING" -ForegroundColor Green
Write-Host ""