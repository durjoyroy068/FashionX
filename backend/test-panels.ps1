$base = "http://127.0.0.1:8000/api/v1"
$failures = @()

function Get-Token($email, $password) {
    $json = "{`"email`":`"$email`",`"password`":`"$password`"}"
    $f = [System.IO.Path]::GetTempFileName()
    Set-Content $f $json -NoNewline
    $out = curl.exe -s -X POST "$base/auth/login" -H "Content-Type: application/json" -H "Accept: application/json" -d "@$f"
    Remove-Item $f -Force
    $r = $out | ConvertFrom-Json
    if ($r.success) { return $r.data.token }
    return $null
}

function Register-Buyer($email) {
    $json = "{`"first_name`":`"Panel`",`"last_name`":`"Test`",`"email`":`"$email`",`"password`":`"FashionX1!`",`"role`":`"buyer`"}"
    $f = [System.IO.Path]::GetTempFileName()
    Set-Content $f $json -NoNewline
    $out = curl.exe -s -w "`n%{http_code}" -X POST "$base/auth/register" -H "Content-Type: application/json" -d "@$f"
    Remove-Item $f -Force
    if ($out -match "HTTP:(\d+)") {
        $code = $Matches[1]
        $body = $out -replace "`nHTTP:\d+$", ""
        if ($code -eq "201") {
            return ($body | ConvertFrom-Json).data.token
        }
    }
    return Get-Token $email "FashionX1!"
}

function Test-Get($label, $path, $token) {
    $bodyFile = [System.IO.Path]::GetTempFileName()
    $code = curl.exe -s -o $bodyFile -w "%{http_code}" -X GET "$base$path" -H "Accept: application/json" -H "Authorization: Bearer $token"
    $body = Get-Content $bodyFile -Raw
    Remove-Item $bodyFile -Force
    $ok = $code -eq "200"
    if (-not $ok) { $script:failures += "$label [$code] $body" }
    $status = if ($ok) { "OK" } else { "FAIL" }
    Write-Host "  $label : $status ($code)"
    if (-not $ok) { Write-Host "    $($body.Substring(0, [Math]::Min(120, $body.Length)))" }
}

$ts = Get-Random
$buyerEmail = "buyer_panel_$ts@test.com"
Write-Host "=== Accounts ==="
$buyerToken = Get-Token "buyer@fashionx.com" "FashionX1!"
if (-not $buyerToken) { $buyerToken = Register-Buyer $buyerEmail }
$adminToken = Get-Token "admin@fashionx.com" "FashionX1!"
$sellerToken = Get-Token "seller@fashionx.com" "FashionX1!"
if (-not $buyerToken -or -not $adminToken -or -not $sellerToken) { Write-Host "Account setup failed"; exit 1 }
Write-Host "Buyer, Seller, Admin tokens OK`n"

for ($round = 1; $round -le 5; $round++) {
    Write-Host "=== ROUND $round ==="
    Test-Get "[BUYER] auth/me" "/auth/me" $buyerToken
    Test-Get "[BUYER] orders" "/orders" $buyerToken
    Test-Get "[BUYER] cart" "/cart" $buyerToken
    Test-Get "[BUYER] wishlist" "/wishlist" $buyerToken
    Test-Get "[BUYER] addresses" "/addresses" $buyerToken
    Test-Get "[BUYER] notifications" "/notifications" $buyerToken
    Test-Get "[SELLER] analytics" "/seller/analytics" $sellerToken
    Test-Get "[SELLER] products" "/seller/products" $sellerToken
    Test-Get "[SELLER] orders" "/seller/orders" $sellerToken
    Test-Get "[SELLER] auctions" "/seller/auctions" $sellerToken
    Test-Get "[ADMIN] dashboard" "/admin/dashboard" $adminToken
    Test-Get "[ADMIN] users" "/admin/users" $adminToken
    Test-Get "[ADMIN] sellers" "/admin/sellers" $adminToken
    Test-Get "[ADMIN] products" "/admin/products" $adminToken
    Test-Get "[ADMIN] orders" "/admin/orders" $adminToken
    Test-Get "[ADMIN] banners" "/admin/banners" $adminToken
    Test-Get "[ADMIN] coupons" "/admin/coupons" $adminToken
    Test-Get "[ADMIN] reviews" "/admin/reviews?status=pending" $adminToken
    Test-Get "[ADMIN] messages" "/admin/contact-messages" $adminToken
    Test-Get "[ADMIN] subscribers" "/admin/newsletter-subscribers" $adminToken
    Test-Get "[ADMIN] settings" "/admin/settings" $adminToken
}

Write-Host "`n=== E2E FLOWS ==="
function Test-Post($label, $path, $token, $jsonBody) {
    $bodyFile = [System.IO.Path]::GetTempFileName()
    Set-Content $bodyFile $jsonBody -NoNewline
    $outFile = [System.IO.Path]::GetTempFileName()
    $code = curl.exe -s -o $outFile -w "%{http_code}" -X POST "$base$path" -H "Content-Type: application/json" -H "Accept: application/json" -H "Authorization: Bearer $token" -d "@$bodyFile"
    $body = Get-Content $outFile -Raw
    Remove-Item $bodyFile, $outFile -Force
    $ok = $code -in @("200","201")
    if (-not $ok) { $script:failures += "$label [$code] $body" }
    $status = if ($ok) { "OK" } else { "FAIL" }
    Write-Host "  $label : $status ($code)"
    if ($ok) { return ($body | ConvertFrom-Json) }
    return $null
}

$prods = curl.exe -s "$base/products?per_page=1" -H "Authorization: Bearer $buyerToken" | ConvertFrom-Json
$productId = $prods.data[0].id
Test-Post "[BUYER] cart add" "/cart" $buyerToken "{`"product_id`":`"$productId`",`"quantity`":1}"
$checkoutRes = Test-Post "[BUYER] checkout" "/checkout/cart" $buyerToken '{"shipping":{"line1":"123 QA St","city":"Dhaka","postal_code":"1200","country_code":"BD"},"payment_method":"card","card_last4":"4242"}'
if ($checkoutRes) {
    $orderId = $checkoutRes.data.id
    Test-Get "[BUYER] invoice" "/orders/$orderId/invoice" $buyerToken
    Test-Get "[BUYER] tracking" "/orders/$orderId/tracking" $buyerToken
}
Test-Post "[BUYER] wishlist add" "/wishlist" $buyerToken "{`"product_id`":`"$productId`"}"

$sellerProds = curl.exe -s "$base/seller/products" -H "Authorization: Bearer $sellerToken" | ConvertFrom-Json
if ($sellerProds.data.Count -gt 0) {
    $spId = $sellerProds.data[0].id
    $putFile = [System.IO.Path]::GetTempFileName()
    Set-Content $putFile '{"stock":10}' -NoNewline
    $outFile = [System.IO.Path]::GetTempFileName()
    $code = curl.exe -s -o $outFile -w "%{http_code}" -X PUT "$base/seller/products/$spId" -H "Content-Type: application/json" -H "Authorization: Bearer $sellerToken" -d "@$putFile"
    Remove-Item $putFile, $outFile -Force
    $ok = $code -eq "200"
    if (-not $ok) { $script:failures += "[SELLER] product update [$code]" }
    Write-Host "  [SELLER] product update : $(if ($ok) { 'OK' } else { 'FAIL' }) ($code)"
}
Test-Get "[SELLER] orders after checkout" "/seller/orders" $sellerToken

Write-Host "`n=== SUMMARY ==="
Write-Host "Failed: $($failures.Count)"
if ($failures.Count) { $failures | Select-Object -Unique | ForEach-Object { Write-Host $_ }; exit 1 }
Write-Host "ALL TESTS PASSED (115 panel + E2E flows)"
exit 0
