# auth-passwordless Specification

## Purpose
Provides passwordless authentication using FIDO2/WebAuthn Passkey (biometric Touch ID, Face ID, Windows Hello) and 6-digit Email OTP verification with rate limiting and user provisioning.

## Requirements

### Requirement: Email OTP Request and Rate Limiting
The system SHALL allow users to request a 6-digit one-time password (OTP) with strict rate limiting: maximum 1 request per 60 seconds per email, and maximum 5 requests per calendar day per IP/email address.

#### Scenario: User requests OTP within rate limits
- **WHEN** user submits email address and last request was more than 60 seconds ago and under daily cap
- **THEN** system generates a secure 6-digit OTP (10-minute TTL), hashes the code with salt, records the attempt timestamp, and dispatches the email

#### Scenario: User requests OTP exceeding frequency limit
- **WHEN** user attempts to request an OTP within 60 seconds of previous request
- **THEN** system rejects the request with HTTP 429 and returns seconds remaining until next permitted request

#### Scenario: User exceeds daily OTP quota
- **WHEN** an email or IP exceeds 5 requests within a 24-hour rolling window
- **THEN** system temporarily locks OTP requests for that identifier and advises user to wait or use Passkey

### Requirement: User Provisioning and Session Establishment
The system SHALL verify OTP codes and transparently provision a new user account if the email is first-time or issue an authenticated session cookie for existing users.

#### Scenario: First-time user verifies OTP
- **WHEN** unauthenticated user submits valid OTP for an unregistered email address
- **THEN** system creates a new user profile, issues a secure HTTP-only session cookie, and flags account for initial onboarding

#### Scenario: Existing user verifies OTP
- **WHEN** existing user submits valid OTP matching their registered email
- **THEN** system verifies and invalidates the OTP token, establishes a session cookie, and updates last login timestamp

### Requirement: Passkey Registration
The system SHALL allow authenticated users to register one or more FIDO2/WebAuthn Passkeys bound to their hardware device (e.g. Touch ID, Face ID, security keys).

#### Scenario: User enrolls current device as Passkey
- **WHEN** authenticated user triggers "Enable Touch ID / Face ID" in settings or onboarding
- **THEN** system generates a WebAuthn registration challenge, receives and validates the signed public key credential, and stores the credential ID and public key

### Requirement: Passkey Authentication
The system SHALL allow users to log in directly using their registered Passkey via biometric verification without entering an OTP or password.

#### Scenario: User logs in using Passkey
- **WHEN** user clicks "Sign in with Passkey" and completes biometric authentication on their device
- **THEN** system verifies the signed WebAuthn assertion against the stored credential and establishes an authenticated session

### Requirement: Multi-Device Credential Management
The system SHALL allow users to view registered Passkeys with friendly device names and creation timestamps, and delete obsolete credentials.

#### Scenario: User revokes a registered Passkey
- **WHEN** user deletes a specific Passkey from the security settings
- **THEN** system removes the credential from the database and rejects future assertion requests using that credential
