## Purpose

Enables collaborative management of consumable items, warranties, and backup supplies across isolated or shared Stock spaces with role-based access control and ownership transfer.

## ADDED Requirements

### Requirement: Stock Space Creation, Customization, and Listing
The system SHALL allow authenticated users to create multiple Stock spaces with a custom name, emoji icon, and optional description. The system SHALL return all Stock spaces to which the authenticated user has membership.

#### Scenario: User creates a new Stock space
- **WHEN** user inputs name "甜蜜的家" and selects emoji icon "🏠"
- **THEN** system creates the Stock space, assigns the creating user as `owner`, and returns the newly created space object

#### Scenario: User lists accessible Stock spaces
- **WHEN** authenticated user requests their Stock spaces list
- **THEN** system returns all Stock spaces where the user is an owner, admin, member, or viewer, along with item count and member count

### Requirement: Stock Space Member Management and RBAC Roles
The system SHALL enforce a role-based access control (RBAC) hierarchy within each Stock space:
- `owner`: Full control, transfer ownership, delete Stock space, invite/remove any member, modify Stock metadata.
- `admin`: Invite members, remove non-admin members, manage all items, modify Stock metadata.
- `member`: View items, record replacements ("Replaced Today"), adjust stock, add/edit items, snooze reminders.
- `viewer`: Read-only access to item status and health overview.

#### Scenario: Admin invites a new member
- **WHEN** an admin generates an invitation with role `member`
- **THEN** system generates an invite record and allows new users joining with that invite to gain `member` role

#### Scenario: Member attempts unauthorized administrative action
- **WHEN** a user with role `member` attempts to delete the Stock space or remove another member
- **THEN** system rejects the request with a 403 Forbidden error

### Requirement: Stock Space Ownership Transfer
The system SHALL allow the current `owner` of a Stock space to transfer ownership to an existing member of that Stock space. Upon confirmation, the system SHALL atomically promote the target member to `owner` and demote the former owner to `admin`.

#### Scenario: Owner successfully transfers ownership to another member
- **WHEN** current owner selects an existing member and confirms ownership transfer
- **THEN** system updates the Stock space `owner_id` to the target user, updates the target user's role to `owner`, and updates the previous owner's role to `admin` within an atomic transaction

#### Scenario: Owner attempts to transfer ownership to non-member
- **WHEN** owner attempts to transfer ownership to a user ID not present in the Stock space member list
- **THEN** system rejects the transfer with a 400 Bad Request error

#### Scenario: Owner attempts to leave Stock space without transferring
- **WHEN** owner attempts to leave a Stock space that still has other members
- **THEN** system prevents departure and requires ownership transfer or space dissolution

### Requirement: Stock Space Invite Code and Link Join Flow
The system SHALL support generating shareable invite codes and URLs with configurable expiration. Users presenting a valid invite code SHALL be automatically added to the target Stock space with the specified role.

#### Scenario: User joins Stock space via valid invite code
- **WHEN** an authenticated user visits the invite link or enters a valid 8-character invite code
- **THEN** system adds the user to the Stock space as a member and redirects them to the Stock space dashboard

#### Scenario: User attempts to join with expired or revoked invite code
- **WHEN** user attempts to use an invite code that has expired or been revoked by an admin
- **THEN** system rejects the join request with a clear expiration message

### Requirement: Stock Space Deletion and Member Departure
The system SHALL allow only the `owner` to permanently dissolve a Stock space. The system SHALL allow non-owner members to voluntarily leave a Stock space at any time.

#### Scenario: Owner deletes Stock space
- **WHEN** owner confirms Stock space deletion with double-confirmation
- **THEN** system soft-deletes or removes the Stock space, its member records, and all associated items and logs

#### Scenario: Non-owner member leaves Stock space
- **WHEN** an admin or member chooses to leave the Stock space
- **THEN** system removes their membership record while preserving the Stock space and items for remaining members
