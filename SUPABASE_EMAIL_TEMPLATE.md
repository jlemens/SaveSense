# Supabase Email Template Configuration

## How to Update Email Templates in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Email Templates** (in the left sidebar)
3. You'll see several email templates. Update the **"Confirm signup"** template with the code below.

## Confirm Signup Email Template

Replace the entire template with this:

### Subject:
```
Confirm your signup - Inputs → Outputs
```

### Body (HTML):
```html
<h2>Welcome to Inputs → Outputs!</h2>

<p>Thank you for signing up. Please confirm your email address to complete your registration.</p>

<p><a href="{{ .ConfirmationURL }}">Confirm your email address</a></p>

<p>Or copy and paste this link into your browser:</p>
<p>{{ .ConfirmationURL }}</p>

<p>If you didn't create an account, you can safely ignore this email.</p>

<p>Best regards,<br>
The Inputs → Outputs Team</p>
```

### Body (Plain Text):
```
Welcome to Inputs → Outputs!

Thank you for signing up. Please confirm your email address to complete your registration.

Confirm your email: {{ .ConfirmationURL }}

If you didn't create an account, you can safely ignore this email.

Best regards,
The Inputs → Outputs Team
```

## Magic Link Email Template (if you use passwordless login)

### Subject:
```
Your login link - Inputs → Outputs
```

### Body (HTML):
```html
<h2>Your Login Link</h2>

<p>Click the link below to sign in to Inputs → Outputs:</p>

<p><a href="{{ .ConfirmationURL }}">Sign in to Inputs → Outputs</a></p>

<p>Or copy and paste this link into your browser:</p>
<p>{{ .ConfirmationURL }}</p>

<p>This link will expire in 1 hour.</p>

<p>If you didn't request this link, you can safely ignore this email.</p>

<p>Best regards,<br>
The Inputs → Outputs Team</p>
```

## Change Email Template

### Subject:
```
Confirm your new email - Inputs → Outputs
```

### Body (HTML):
```html
<h2>Confirm Your New Email</h2>

<p>You requested to change your email address. Please confirm your new email:</p>

<p><a href="{{ .ConfirmationURL }}">Confirm new email address</a></p>

<p>Or copy and paste this link into your browser:</p>
<p>{{ .ConfirmationURL }}</p>

<p>If you didn't request this change, please contact support immediately.</p>

<p>Best regards,<br>
The Inputs → Outputs Team</p>
```

## Reset Password Template

### Subject:
```
Reset your password - Inputs → Outputs
```

### Body (HTML):
```html
<h2>Reset Your Password</h2>

<p>You requested to reset your password. Click the link below to set a new password:</p>

<p><a href="{{ .ConfirmationURL }}">Reset password</a></p>

<p>Or copy and paste this link into your browser:</p>
<p>{{ .ConfirmationURL }}</p>

<p>This link will expire in 1 hour.</p>

<p>If you didn't request a password reset, you can safely ignore this email.</p>

<p>Best regards,<br>
The Inputs → Outputs Team</p>
```

## Notes

- The `{{ .ConfirmationURL }}` is a template variable that Supabase replaces with the actual confirmation link
- You can customize the styling, but keep the template variables (like `{{ .ConfirmationURL }}`)
- Make sure to save the changes after updating each template

