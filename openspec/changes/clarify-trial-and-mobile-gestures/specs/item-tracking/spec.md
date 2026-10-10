## ADDED Requirements

### Requirement: Complete trial item import
The system SHALL offer explicit import of locally saved custom guest items after login, preserving current dates, remaining quantity, daily usage, units, spare stock, stored status, notes and photos. Demo items SHALL be excluded.

#### Scenario: Import quantity tracked items
- **WHEN** a signed-in user imports a local custom quantity item
- **THEN** its initial and remaining quantity, daily usage and quantity unit are retained

#### Scenario: Partial import failure
- **WHEN** some item imports fail
- **THEN** failed items remain locally and a retry action is offered without recreating successful items in the current session

#### Scenario: Retry after a lost response or reload
- **WHEN** cloud creation succeeded but its response or local cleanup failed, and the user retries from the same or a new page session
- **THEN** the server reuses the account-scoped source item identity without creating a duplicate or overwriting existing cloud changes

#### Scenario: Imported item was deleted
- **WHEN** a previously imported item was deleted and the same source item is retried
- **THEN** the server reports a conflict instead of recreating it

#### Scenario: Import is deferred
- **WHEN** a user signs in and does not select import
- **THEN** local custom items remain available for later import
