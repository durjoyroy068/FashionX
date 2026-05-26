<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

class VerifyEmailNotification extends Notification
{
    use Queueable;

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $verifyUrl = URL::temporarySignedRoute(
            'api.verification.verify',
            now()->addMinutes(60),
            ['id' => $notifiable->getKey(), 'hash' => sha1($notifiable->getEmailForVerification())]
        );

        $frontend = config('fashionx.frontend_url') . '/pages/verify-email.html?verify_url=' . urlencode($verifyUrl);

        return (new MailMessage)
            ->subject('Verify your FashionX email')
            ->line('Please verify your email to complete registration.')
            ->action('Verify Email', $frontend);
    }
}
