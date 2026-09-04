# pwa-mobile-ui Specification

## Purpose
Provides a mobile-first, responsive, and installable PWA user interface with smooth touch interactions, tactile feedback, item health progress visualization, and offline caching.

## Requirements

### Requirement: Mobile-First Responsive Layout and Navigation
The system SHALL deliver a mobile-first responsive web design (RWD) optimized for one-handed mobile touch operations, featuring a sticky bottom navigation bar on mobile viewports and a collapsible sidebar on desktop viewports.

#### Scenario: Mobile viewport navigation
- **WHEN** user accesses the app on a mobile device (width < 768px)
- **THEN** system displays bottom navigation (Items, Calendar/Timeline, Stock/Shopping, Settings) with 44px+ minimum touch targets and safe area insets (iOS Home Bar)

#### Scenario: Desktop viewport layout
- **WHEN** user accesses the app on a desktop browser (width >= 1024px)
- **THEN** system renders a dual-pane or grid layout with a side navigation rail and expanded detail cards

### Requirement: Visual Lifespan and Status Presentation
The system SHALL present item health through intuitive visual cues, including circular/linear lifespan progress bars, color-coded health states, remaining days countdown, and category-themed icons.

#### Scenario: User views dashboard item list
- **WHEN** user opens the main dashboard
- **THEN** system renders item cards sorted by urgency, displaying percentage elapsed, remaining days badge, and quick action buttons

### Requirement: PWA Installation and Offline Readiness
The system SHALL provide a standard Web App Manifest (`manifest.json`) and Service Worker that enables home screen installation and offline asset caching with graceful fallback when disconnected.

#### Scenario: User installs PWA on device
- **WHEN** browser detects standalone PWA support and user accepts "Add to Home Screen"
- **THEN** app installs as a standalone application with standalone display mode, custom theme color, and application icon

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
