# Spec Delta: agent-api-and-keys

## Purpose

Enables automated and programmatic consumable lifecycle management by external AI agents and scripts through secure API keys and standard REST endpoints.

## ADDED Requirements

### Requirement: Personal API Key Generation and Lifecycle Management
The system SHALL allow authenticated users to generate, view, label, and revoke API keys with format `ab_live_<random_hex>`, optionally scoped to specific stock spaces, storing only SHA-256 hashes of the keys in the database.

#### Scenario: User creates a new API key with stock scope
- **WHEN** user requests a new API key with a label and optional target stock space
- **THEN** system generates a random key with `ab_live_` prefix, stores its SHA-256 hash, and displays the full plaintext key exactly once with a copy button

#### Scenario: User lists and revokes an API key
- **WHEN** user views API keys in settings and clicks revoke on a specific key
- **THEN** system immediately revokes or deletes the key and rejects subsequent requests using this key with HTTP 401

### Requirement: Bearer Token API Key Authentication
The system SHALL authenticate incoming requests with `Authorization: Bearer ab_live_...` against active API keys, associating the request with the owning user and updating `lastUsedAt`.

#### Scenario: Valid API key request
- **WHEN** client sends a request to `/api/v1/*` with a valid Bearer API key
- **THEN** system identifies the user, updates the key's `lastUsedAt` timestamp, and proceeds with the operation

#### Scenario: Invalid or revoked API key request
- **WHEN** client sends a request with an invalid, expired, or revoked API key
- **THEN** system returns HTTP 401 Unauthorized with error message "Invalid or revoked API key"

### Requirement: Agent Programmatic Item CRUD
The system SHALL provide REST endpoints under `/api/v1/items` for creating, reading, updating, and deleting tracked consumables with comprehensive query filters adhering to Asia/Taipei midnight rules.

#### Scenario: Querying items with status filters
- **WHEN** client requests `GET /api/v1/items?status=due_soon&category=kitchen`
- **THEN** system returns a JSON list of kitchen items due within the configured warning threshold, including lifecycle metrics and remaining days

#### Scenario: Querying overdue items
- **WHEN** client requests `GET /api/v1/items?status=overdue`
- **THEN** system returns items whose nextDueDate strictly precedes current Taiwan business day, keeping today's due items as due_soon

#### Scenario: Creating a consumable item via API
- **WHEN** client posts valid item payload containing name, category, trackingMode, and cycle/quantity parameters
- **THEN** system creates the item in the target or default stock and returns HTTP 201 with the created item resource

#### Scenario: Updating an existing item via API
- **WHEN** client sends `PATCH /api/v1/items/:id` with updated fields (e.g. notes, backupStock, cycleDays)
- **THEN** system updates the item and returns the updated item representation

#### Scenario: Deleting an item via API
- **WHEN** client sends `DELETE /api/v1/items/:id`
- **THEN** system deletes the item and returns HTTP 200 with confirmation

### Requirement: Agent Quick Actions for Replacement and Inventory Deduction
The system SHALL provide fast, atomic endpoints for logging replacements (`/api/v1/items/:id/replace`) and recording unit consumption (`/api/v1/items/:id/consume`).

#### Scenario: Agent triggers today replaced action with zero backup stock
- **WHEN** client posts to `/api/v1/items/:id/replace` for an item with backupStock equal to 0
- **THEN** system updates `startDate` to today, recalculates next due date, logs history, leaves backupStock at 0 with `stockDeducted: false`, and returns HTTP 200

#### Scenario: Agent triggers today replaced action with available backup stock
- **WHEN** client posts to `/api/v1/items/:id/replace` for an item with backupStock greater than 0
- **THEN** system updates `startDate` to today, decrements backupStock by 1 with `stockDeducted: true`, logs history atomically, and returns HTTP 200

#### Scenario: Agent decrements consumable quantity exceeding available stock
- **WHEN** client posts to `/api/v1/items/:id/consume` with amount greater than currentQuantity
- **THEN** system clamps currentQuantity to 0, returns the actual quantity deducted, and issues a restock warning flag
