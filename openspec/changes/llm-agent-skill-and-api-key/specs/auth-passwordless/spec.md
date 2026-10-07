# Spec Delta: auth-passwordless

## ADDED Requirements

### Requirement: Unified Session Cookie and API Key Bearer Authentication
The system SHALL support unified authentication across Web endpoints and Agent endpoints, accepting either HTTP-only session cookies or `Authorization: Bearer` API keys.

#### Scenario: Request authenticated via Bearer token
- **WHEN** incoming request includes a valid `Authorization: Bearer ab_live_...` header
- **THEN** system resolves the owning user context identically to an active cookie session without requiring browser cookies
