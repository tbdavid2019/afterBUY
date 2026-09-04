## MODIFIED Requirements

### Requirement: Item Creation with Tracking Modes
The system SHALL support creating items with specific tracking modes: interval replacement (e.g. replace every N days/months), fixed expiration date (e.g. food/medication expiry), period-after-opening (PAO months), and warranty period countdown. The system SHALL also support optional purchase price (`price`), specification model (`specModel`), and expanded everyday presets (including printer ink, vitamins/supplements, batteries, and air filters).

#### Scenario: User creates a recurring consumable item
- **WHEN** user creates an item with a start date and a 90-day replacement cycle
- **THEN** system computes next due date as start date + 90 days and records initial replacement history

#### Scenario: User creates an opened cosmetic or medicine with PAO
- **WHEN** user records opening date and specifies a 6-month PAO
- **THEN** system calculates expiration date as 6 months from opening date

#### Scenario: User creates item with purchase price and spec model from expanded presets
- **WHEN** user selects the "Printer Ink" template and inputs price NT$450 with spec "003 Black"
- **THEN** system saves the item with price, specification model, and default 180-day cycle

### Requirement: Consumable Replacement and Stock Decrement
The system SHALL provide a one-tap action to mark an item as replaced, resetting the lifecycle timer and automatically decrementing the backup stock count if available. The system SHALL additionally support batch replacement for multiple items simultaneously via a transactional batch endpoint.

#### Scenario: User replaces item with remaining backup stock
- **WHEN** user clicks "Replaced Today" on an item with backup stock count of 2
- **THEN** system sets the new start date to today, decrements backup stock to 1, and appends a record to the replacement history log

#### Scenario: User replaces item when backup stock is zero
- **WHEN** user clicks "Replaced Today" on an item with 0 backup stock
- **THEN** system updates the new start date to today, keeps backup stock at 0, and flags the item as "Stock Empty / Needs Repurchase"

#### Scenario: User performs batch replacement on multiple items
- **WHEN** client sends a batch replacement request containing an array of item IDs
- **THEN** backend processes all items within a D1 batch transaction, resets start dates to today, decrements stock, records replacement history for each item, and returns the updated items
