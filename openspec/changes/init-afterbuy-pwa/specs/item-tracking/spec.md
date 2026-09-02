## Purpose

Manages the lifecycle, usage duration, replacement intervals, warranty expiration, period-after-opening (PAO), and backup inventory quantities for personal items and consumables.

## ADDED Requirements

### Requirement: Item Creation with Tracking Modes
The system SHALL support creating items with specific tracking modes: interval replacement (e.g. replace every N days/months), fixed expiration date (e.g. food/medication expiry), period-after-opening (PAO months), and warranty period countdown.

#### Scenario: User creates a recurring consumable item
- **WHEN** user creates an item with a start date and a 90-day replacement cycle
- **THEN** system computes next due date as start date + 90 days and records initial replacement history

#### Scenario: User creates an opened cosmetic or medicine with PAO
- **WHEN** user records opening date and specifies a 6-month PAO
- **THEN** system calculates expiration date as 6 months from opening date

### Requirement: Consumable Replacement and Stock Decrement
The system SHALL provide a one-tap action to mark an item as replaced, resetting the lifecycle timer and automatically decrementing the backup stock count if available.

#### Scenario: User replaces item with remaining backup stock
- **WHEN** user clicks "Replaced Today" on an item with backup stock count of 2
- **THEN** system sets the new start date to today, decrements backup stock to 1, and appends a record to the replacement history log

#### Scenario: User replaces item when backup stock is zero
- **WHEN** user clicks "Replaced Today" on an item with 0 backup stock
- **THEN** system updates the new start date to today, keeps backup stock at 0, and flags the item as "Stock Empty / Needs Repurchase"

### Requirement: Item Health Status Computation
The system SHALL compute dynamic item health states based on elapsed time: "Normal / Healthy" (> 15% remaining), "Due Soon" (<= 15% or <= 7 days remaining), "Due Today / Overdue" (<= 0 days), and "Out of Stock" (stock count == 0).

#### Scenario: Status changes to Due Soon
- **WHEN** current date reaches within 7 days of the scheduled replacement or expiration date
- **THEN** system updates item visual badge to "Due Soon" and triggers upcoming reminder events

#### Scenario: Status changes to Overdue
- **WHEN** current date is past the replacement deadline
- **THEN** system highlights the item in warning red and counts days overdue
