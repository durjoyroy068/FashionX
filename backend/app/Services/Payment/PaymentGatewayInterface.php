<?php

namespace App\Services\Payment;

use App\Models\Order;
use App\Models\Payment;

interface PaymentGatewayInterface
{
    public function provider(): string;

    /** @return array{success:bool,transaction_id?:string,redirect_url?:string,meta?:array,message?:string} */
    public function charge(Order $order, Payment $payment, array $payload = []): array;

    /** @return array{success:bool,status?:string,meta?:array} */
    public function verifyCallback(array $payload): array;

    /** @return array{success:bool,transaction_id?:string,message?:string} */
    public function refund(Payment $payment, float $amount): array;
}
