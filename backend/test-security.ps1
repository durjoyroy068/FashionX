# FashionX Security Smoke Tests - run with API at http://127.0.0.1:8000
$ErrorActionPreference = "Continue"
$base = "http://127.0.0.1:8000/api/v1"
$jsonHeaders = @{ Accept = "application/json"; "Content-Type" = "application/json" }
$pass = 0
$fail = 0

function Test-Case($name, $script) {
    try {
        & $script
        if ($?) { Write-Host "[PASS] $name" -ForegroundColor Green; $script:pass++ }
        else { Write-Host "[FAIL] $name" -ForegroundColor Red; $script:fail++ }
    } catch {
        Write-Host "[FAIL] $name - $($_.Exception.Message)" -ForegroundColor Red
        $script:fail++
    }
}

Write-Host ""
Write-Host "=== FashionX Security Tests ===" -ForegroundColor Cyan
Write-Host ""

Test-Case "Health does not expose env" {
    $r = Invoke-RestMethod "$base/health" -Headers @{ Accept = "application/json" }
    if ($r.PSObject.Properties.Name -contains "env") { throw "env field leaked" }
}

Test-Case "SQL injection login rejected safely" {
    $body = @{ email = "admin@fashionx.com' OR '1'='1"; password = "x" } | ConvertTo-Json
    try {
        Invoke-RestMethod -Method Post -Uri "$base/auth/login" -Body $body -Headers $jsonHeaders
        throw "login should fail"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if ($code -ne 401 -and $code -ne 422 -and $code -ne 429) { throw "unexpected status $code" }
    }
}

Test-Case "Admin routes require auth" {
    try {
        Invoke-RestMethod "$base/admin/users" -Headers @{ Accept = "application/json" }
        throw "should be 401"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if ($code -ne 401 -and $code -ne 403) { throw "expected 401 or 403 got $code" }
    }
}

Test-Case "Forged Stripe webhook rejected" {
    $body = '{"status":"succeeded","transaction_id":"fake_txn"}'
    try {
        Invoke-RestMethod -Method Post -Uri "$base/payments/webhook/stripe" -Body $body -Headers $jsonHeaders
        throw "webhook should fail"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if ($code -ne 403) { throw "expected 403 got $code" }
    }
}

Test-Case "Forged SSLCommerz webhook rejected without val_id" {
    $body = '{"status":"VALID"}'
    try {
        Invoke-RestMethod -Method Post -Uri "$base/payments/webhook/sslcommerz" -Body $body -Headers $jsonHeaders
        throw "webhook should fail"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if ($code -ne 403) { throw "expected 403 got $code" }
    }
}

Test-Case "Buyer cannot access another user order IDOR" {
    $login = @{ email = "buyer@fashionx.com"; password = "FashionX1!" } | ConvertTo-Json
    $auth = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -Body $login -Headers $jsonHeaders
    $token = $auth.data.token
    $headers = @{ Authorization = "Bearer $token" }
    try {
        Invoke-RestMethod -Uri "$base/orders/ord_99999" -Headers ($headers + @{ Accept = "application/json" })
        throw "should 404"
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if ($code -ne 404) { throw "expected 404 got $code" }
    }
}

Test-Case "Register cannot self-assign seller without approval" {
    $email = "sectest_$([guid]::NewGuid().ToString('N').Substring(0,8))@example.com"
    $body = @{
        first_name = "Sec"; last_name = "Test"; email = $email
        password = "FashionX1!"; role = "seller"
    } | ConvertTo-Json
    $r = Invoke-RestMethod -Method Post -Uri "$base/auth/register" -Body $body -Headers $jsonHeaders
    if ($r.data.user.role -eq "admin" -or $r.data.user.role -eq "seller") {
        throw "privilege escalation: got role $($r.data.user.role)"
    }
    if (-not $r.data.seller_pending) { throw "seller application flag missing" }
}

Test-Case "Security headers present" {
    $resp = Invoke-WebRequest -Uri "$base/health" -UseBasicParsing
    $h = $resp.Headers
    foreach ($name in @("X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy")) {
        if (-not $h[$name]) { throw "missing $name" }
    }
}

Test-Case "Contact endpoint rate limited after 6 posts" {
    $blocked = $false
    1..6 | ForEach-Object {
        $body = @{ name = "Bot"; email = "bot@test.com"; message = "spam $_" } | ConvertTo-Json
        try {
            Invoke-RestMethod -Method Post -Uri "$base/contact" -Body $body -Headers $jsonHeaders
        } catch {
            if ($_.Exception.Response.StatusCode.value__ -eq 429) { $blocked = $true }
        }
    }
    if (-not $blocked) { throw "rate limit not triggered after 6 requests" }
}

Write-Host ""
Write-Host "=== Results: $pass passed, $fail failed ===" -ForegroundColor Cyan
Write-Host ""
if ($fail -gt 0) { exit 1 }
