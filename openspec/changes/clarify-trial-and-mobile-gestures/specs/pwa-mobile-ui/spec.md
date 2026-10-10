## ADDED Requirements

### Requirement: Visible trial and storage status
The system SHALL visibly identify signed-out trial mode on mobile and all main pages, explain local browser persistence and device limits, and offer sign in or registration.

#### Scenario: User browses without signing in
- **WHEN** a signed-out user opens any main page
- **THEN** trial status, local storage limitations and a sign in or registration action are visible without expanding a disclosure

#### Scenario: Local persistence fails
- **WHEN** a guest change cannot be saved locally
- **THEN** a persistent error identifies the unsaved state and offers retry

### Requirement: Deliberate mobile touch gestures
The system SHALL support right swipe on eligible items for replacement with Undo, left swipe for an action menu, horizontal swipe on main page noninteractive areas for adjacent navigation, and downward swipe on the item dialog header for closing.

#### Scenario: Right swipe replaces an eligible item
- **WHEN** a touch gesture moves sufficiently right on an active cycle, PAO or quantity item
- **THEN** today replacement is applied and the existing Undo action is offered

#### Scenario: Left swipe opens safe actions
- **WHEN** a user swipes left on an item
- **THEN** the action menu opens without deleting the item

#### Scenario: Scroll and cancelled gestures
- **WHEN** a user scrolls vertically, uses an interactive control, cancels a gesture, adds another finger or loses window focus
- **THEN** unintended actions do not execute and the next gesture remains usable

#### Scenario: Close a dirty form with a swipe
- **WHEN** a user swipes downward on the item dialog header after changing inputs
- **THEN** closing requires an explicit discard confirmation and cancellation preserves the input
