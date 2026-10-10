## ADDED Requirements

### Requirement: Uninterrupted item entry
The system SHALL preserve an open item form across stock refreshes, viewport changes, backdrop taps, and IME composition cancellation.

#### Scenario: Stock data refreshes while typing
- **WHEN** stocks or item data refreshes while the item form is open
- **THEN** the active form tab and entered values remain unchanged

#### Scenario: Mobile keyboard or backdrop interaction
- **WHEN** the viewport shrinks, a user taps the backdrop, or Escape occurs during IME composition
- **THEN** the item form stays open and preserves entered values

### Requirement: User initiated PWA updates
The system SHALL reload for a service worker update only after an explicit update action in the current page, and SHALL defer update prompts and automatic release notes while an editing dialog is open.

#### Scenario: Update installs while editing
- **WHEN** an update becomes available while an editing dialog is open
- **THEN** the page does not reload and the update prompt waits until the dialog closes

#### Scenario: Another tab activates an update
- **WHEN** another tab activates a service worker
- **THEN** the current page does not reload without its own explicit update action

#### Scenario: User applies an update
- **WHEN** the user clicks Update with no editing dialog open
- **THEN** the waiting worker activates and the current page reloads once
