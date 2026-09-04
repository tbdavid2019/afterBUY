## MODIFIED Requirements

### Requirement: Web Push Notification Dispatch
The system SHALL support subscribing PWA client devices to Web Push via VAPID and sending background push notifications when items across any of the user's accessible Stock spaces reach their alert threshold. The push notification message SHALL include the originating Stock space name in its title or body.

#### Scenario: User enables Web Push on PWA
- **WHEN** user enables push notifications in PWA and grants browser permission
- **THEN** system stores the push subscription (endpoint, keys) and associates it with the authenticated user

#### Scenario: Scheduled job triggers Web Push alert
- **WHEN** scheduled reminder job identifies items due today for a subscribed user across multiple Stock spaces
- **THEN** system sends Web Push payloads formatted with the originating Stock space name (e.g. `[甜蜜的家] Brita 濾芯今日該換`), days remaining, and direct deep-link to the item detail page

### Requirement: RFC 5545 WebCal Feed with Sequence, Cancellation, and Token Rotation
The system SHALL provide both an aggregate All-in-One WebCal feed (`/api/calendar/[user_token].ics`) covering all accessible Stock spaces and individual Stock WebCal feeds (`/api/calendar/stocks/[stock_token].ics`) for single-space subscription. Both feed types SHALL produce standard iCalendar events with stable `UID`, incremented `SEQUENCE` on item updates, `STATUS:CANCELLED` for removed or completed reminders, and support for token regeneration.

#### Scenario: User subscribes to private WebCal feed
- **WHEN** user subscribes to their personal all-stocks calendar feed URL or a single Stock calendar feed URL in Apple Calendar or Google Calendar
- **THEN** system serves a valid `.ics` stream containing VEVENT components for upcoming item replacement and expiration dates prefixed with the Stock name

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
The system SHALL send scheduled email notifications to users detailing items that are due for replacement within user-configured warning windows (e.g. 3 days prior and day-of). The email digest SHALL group due items by their originating Stock space.

#### Scenario: Morning digest email delivery
- **WHEN** daily cron job executes at user's configured morning notification time (e.g. 08:00 AM)
- **THEN** system aggregates all items reaching alert thresholds across all user's Stock spaces, groups them by Stock name (e.g. "甜蜜的家", "電子與木工坊"), and dispatches a responsive email digest with action buttons
