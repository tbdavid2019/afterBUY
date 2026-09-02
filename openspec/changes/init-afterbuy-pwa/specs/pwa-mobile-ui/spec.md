## Purpose

Provides a mobile-first, responsive, and installable PWA user interface with smooth touch interactions, tactile feedback, item health progress visualization, and offline caching.

## ADDED Requirements

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
