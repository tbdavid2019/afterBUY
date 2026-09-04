## MODIFIED Requirements

### Requirement: Item Creation with Tracking Modes
The system SHALL support creating items within a designated Stock space (`stock_id`). Items SHALL support specific tracking modes: interval replacement (e.g. replace every N days/months), fixed expiration date (e.g. food/medication expiry), period-after-opening (PAO months), and warranty period countdown. The system SHALL also support optional purchase price (`price`), specification model (`specModel`), spatial location (`location`), unbox-on-demand stored status (`isStored`), and reminder postponement (`snoozeUntil`).

#### Scenario: User creates a recurring consumable item
- **WHEN** user creates an item with a start date and a 90-day replacement cycle in Stock space "甜蜜的家"
- **THEN** system computes next due date as start date + 90 days, assigns the item to the specified `stock_id`, and records initial replacement history with `created_by_user_id`

#### Scenario: User creates an opened cosmetic or medicine with PAO
- **WHEN** user records opening date and specifies a 6-month PAO
- **THEN** system calculates expiration date as 6 months from opening date

#### Scenario: User creates item with purchase price and spec model from expanded presets
- **WHEN** user selects the "Printer Ink" template and inputs price NT$450 with spec "003 Black"
- **THEN** system saves the item with price, specification model, and default 180-day cycle

### Requirement: Consumable Replacement and Stock Decrement
The system SHALL provide a one-tap action to mark an item as replaced, resetting the lifecycle timer and automatically decrementing the backup stock count if available. The replacement history log SHALL record the identity of the specific user (`replaced_by_user_id`) who performed the replacement. The system SHALL additionally support batch replacement for multiple items simultaneously via a transactional batch endpoint.

#### Scenario: User replaces item with remaining backup stock
- **WHEN** user or member clicks "Replaced Today" on an item with backup stock count of 2
- **THEN** system sets the new start date to today, decrements backup stock to 1, and appends a record to the replacement history log containing the user's ID and timestamp

#### Scenario: User replaces item when backup stock is zero
- **WHEN** user clicks "Replaced Today" on an item with 0 backup stock
- **THEN** system updates the new start date to today, keeps backup stock at 0, and flags the item as "Stock Empty / Needs Repurchase"

#### Scenario: User performs batch replacement on multiple items
- **WHEN** client sends a batch replacement request containing an array of item IDs
- **THEN** backend processes all items within a D1 batch transaction, resets start dates to today, decrements stock, records replacement history with the acting user's ID for each item, and returns the updated items

## ADDED Requirements

### Requirement: Multi-Stock View and Aggregation Filter
The system SHALL support both an aggregate "All Stocks" view and isolated single-Stock views. In "All Stocks" view, the dashboard SHALL display items across all Stock spaces the user belongs to, with clear visual badges indicating the originating Stock space. In single-Stock view, the dashboard SHALL only display items belonging to the selected Stock space.

#### Scenario: User views All Stocks aggregate dashboard
- **WHEN** user selects "All Stocks" from the Stock switcher dropdown
- **THEN** system displays aggregated metrics (total overdue, healthy, restock) across all user's Stock spaces, and displays originating Stock badges on each item card

#### Scenario: User filters items by single Stock space
- **WHEN** user selects a specific Stock space "電子與木工坊" from the switcher
- **THEN** system filters the dashboard to display only items belonging to that specific Stock space
