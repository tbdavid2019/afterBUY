## ADDED Requirements

### Requirement: Multi-Item Selection and Floating Action Bar
The system SHALL provide a multi-select mode on Dashboard and Stock views, allowing users to toggle checkboxes across items and display a responsive floating action bar at the bottom with item count and batch action triggers (Batch Replaced, Adjust Stock, Delete).

#### Scenario: User enters multi-select mode
- **WHEN** user taps "Select" in the dashboard toolbar
- **THEN** checkboxes appear on all item cards and the bottom navigation smoothly transitions into a floating batch action bar

#### Scenario: User cancels multi-select mode
- **WHEN** user taps "Cancel" or clears selection
- **THEN** checkboxes disappear and the standard bottom navigation bar is restored

### Requirement: Multi-Photo Camera Capture and Batch Intake Modal
The system SHALL provide a batch intake interface allowing users to capture multiple photos in sequence with mobile camera, review thumbnail previews, and fill in consumable parameters before batch saving.

#### Scenario: User opens batch camera capture
- **WHEN** user taps "Batch Intake" from the add item menu
- **THEN** file selector opens with multi-image camera support (`capture="environment"` / `multiple`), allowing multiple photos to be uploaded and presented as a preview carousel
