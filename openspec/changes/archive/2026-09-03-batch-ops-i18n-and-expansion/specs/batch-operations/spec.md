## Purpose
Enables users to perform batch actions on multiple consumables at once, including batch photo capture/intake, batch replacement, and batch inventory modification.

## ADDED Requirements

### Requirement: Batch Photo Upload and Intake Drafts
The system SHALL support selecting or capturing multiple photos simultaneously via camera or file picker, uploading them concurrently to Cloudflare R2, and generating draft item entries ready for fast sequential editing.

#### Scenario: User captures multiple photos on mobile
- **WHEN** user taps "Batch Intake" and captures 3 photos of newly purchased items
- **THEN** system uploads all 3 images in parallel, displays progress, and opens a streamlined batch editor showing the 3 image cards

### Requirement: Multi-Select Mode and Batch Actions
The system SHALL provide an intuitive multi-selection mode enabling batch replacement ("Replaced Today" for all selected items), batch stock increments/decrements, and batch item deletion.

#### Scenario: User performs batch replacement for selected items
- **WHEN** user selects 3 items (e.g. toothbrush, water filter, sponge) and taps "Replaced Today" on the floating action bar
- **THEN** system sends a single transactional batch request, resets the timers for all 3 items, decrements their respective backup stock by 1, and records 3 history entries atomically

#### Scenario: User batch updates backup stock
- **WHEN** user selects multiple items in the Shopping / Stock view and clicks "+1 Stock"
- **THEN** system increments backup inventory for each selected item and updates UI counts immediately
