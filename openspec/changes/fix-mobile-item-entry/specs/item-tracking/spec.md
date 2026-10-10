## ADDED Requirements

### Requirement: Standard shampoo preset
The system SHALL include a shared bathroom shampoo preset searchable by 洗髮精 and 洗髮乳, with an editable 60 day replenishment cycle and a spare stock alert threshold of one.

#### Scenario: User searches for shampoo
- **WHEN** the user searches the preset catalog for 洗髮精 or 洗髮乳
- **THEN** the shampoo preset appears and can populate the item form

#### Scenario: Agent accesses shampoo preset
- **WHEN** an Agent requests the shared preset catalog
- **THEN** it includes the same `shampoo` preset and tracking defaults

### Requirement: Distinct oral care presets
The system SHALL provide separate bathroom presets for electric toothbrush heads, manual toothbrushes, and tongue brushes, each with its own stable identifier, editable replacement cycle, and spare stock threshold.

#### Scenario: User chooses an oral care tool
- **WHEN** the user searches for 電動牙刷刷頭, 普通牙刷, or 舌苔刷
- **THEN** a distinct matching preset is available to populate the item form

#### Scenario: Existing toothbrush preset identity
- **WHEN** a client requests the `toothbrush-head` preset
- **THEN** it returns the explicitly named 電動牙刷刷頭 preset
