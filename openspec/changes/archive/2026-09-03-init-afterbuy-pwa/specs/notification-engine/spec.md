## Purpose

Dispatches multi-channel replacement and expiration alerts across Web Push, dynamic RFC 5545 WebCal calendar feeds (with sequence tracking, cancellation, and token rotation), Email digests, and VIP SMS.

## ADDED Requirements

### Requirement: Web Push Notification Dispatch
The system SHALL support subscribing PWA client devices to Web Push via VAPID and sending background push notifications when items reach their alert threshold.

#### Scenario: User enables Web Push on PWA
- **WHEN** user enables push notifications in PWA and grants browser permission
- **THEN** system stores the push subscription (endpoint, keys) and associates it with the authenticated user

#### Scenario: Scheduled job triggers Web Push alert
- **WHEN** scheduled reminder job identifies items due today for a subscribed user
- **THEN** system sends Web Push payload formatted with item title, days remaining, and direct deep-link to the item detail page

### Requirement: RFC 5545 WebCal Feed with Sequence, Cancellation, and Token Rotation
The system SHALL provide a secure, user-specific WebCal feed (`/api/calendar/[token].ics`) that produces standard iCalendar events with stable `UID`, incremented `SEQUENCE` on item updates, `STATUS:CANCELLED` for removed or completed reminders, and support for token regeneration.

#### Scenario: User subscribes to private WebCal feed
- **WHEN** user generates and subscribes to their unique calendar feed URL in Apple Calendar or Google Calendar
- **THEN** system serves a valid `.ics` stream containing VEVENT components for all upcoming item replacement and expiration dates with predefined alarm triggers

#### Scenario: Item reminder date is modified
- **WHEN** user changes the replacement cycle or target date for an item
- **THEN** system increments the event's `SEQUENCE` number while maintaining the same `UID`, enabling calendar subscribers to update the existing event cleanly

#### Scenario: Item is deleted or reminder cancelled
- **WHEN** user deletes an item or turns off reminders
- **THEN** system emits a VEVENT with the item's `UID`, incremented `SEQUENCE`, and `STATUS:CANCELLED` in the `.ics` feed for at least 30 days so subscribing calendar clients purge the event

#### Scenario: User regenerates calendar feed token
- **WHEN** user requests "Regenerate Calendar URL" from settings due to security concerns or token leak
- **THEN** system revokes the previous token, generates a cryptographically random new token, and immediately returns 401 Unauthorized for requests using the old token

### Requirement: Email Expiry and Digest Alerts
The system SHALL send scheduled email notifications to users detailing items that are due for replacement within user-configured warning windows (e.g. 3 days prior and day-of).

#### Scenario: Morning digest email delivery
- **WHEN** daily cron job executes at user's configured morning notification time (e.g. 08:00 AM)
- **THEN** system aggregates all items reaching alert thresholds and dispatches a responsive email digest with action buttons

### Requirement: VIP SMS Notification Channel (Phase 2)
The system SHALL support sending high-priority SMS alerts for VIP/paid subscription members when critical items reach zero backup stock or overdue status.

#### Scenario: VIP member receives SMS for urgent consumable
- **WHEN** an item marked for SMS alerts reaches overdue status and user has active VIP tier
- **THEN** system dispatches an SMS message to user's verified phone number and logs message delivery
