<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background-color: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            margin: 20px 0;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #059669;
            margin-bottom: 10px;
        }
        .otp-box {
            background-color: #ffffff;
            border: 2px solid #059669;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
        }
        .otp-code {
            font-size: 32px;
            font-weight: bold;
            color: #059669;
            letter-spacing: 5px;
            font-family: 'Courier New', monospace;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 12px;
        }
        .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">{{ $appName }}</div>
            <h2>Password Reset Request</h2>
        </div>

        <p>Hello {{ $user->fname }} {{ $user->lname }},</p>

        <p>We received a request to reset your password for your {{ $appName }} account. Use the OTP code below to proceed with resetting your password:</p>

        <div class="otp-box">
            <p style="margin: 0 0 10px 0; color: #666;">Your password reset code:</p>
            <div class="otp-code">{{ $otpCode }}</div>
        </div>

        <p>This code will expire in <strong>15 minutes</strong>. If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>

        <div class="warning">
            <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please contact our support team immediately.
        </div>

        <p>If you have any questions, please don't hesitate to contact our support team.</p>

        <p>Best regards,<br>{{ $appName }} Team</p>

        <div class="footer">
            <p>This is an automated email, please do not reply.</p>
        </div>
    </div>
</body>
</html>

