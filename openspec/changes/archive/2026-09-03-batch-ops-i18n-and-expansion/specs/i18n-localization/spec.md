## Purpose
Provides dynamic internationalization and bilingual support (Traditional Chinese and English) across the application with user preference persistence.

## ADDED Requirements

### Requirement: Bilingual Language Selection and Persistence
The system SHALL provide an instant language switcher supporting Traditional Chinese (`zh-TW`) and English (`en`), persisting user preference in local storage and applying it across all views and modals without page reload.

#### Scenario: User switches interface language to English
- **WHEN** user selects "English" from header or settings
- **THEN** system immediately re-renders all UI labels, navigation buttons, status chips, and form placeholders in English and saves preference to `localStorage`

#### Scenario: User opens app with stored language preference
- **WHEN** user visits the application with a previously saved language preference
- **THEN** system initializes the UI with the saved language, defaulting to browser language or Traditional Chinese if not set

### Requirement: Dynamic UI and Relative Date Localization
The system SHALL localize item health badges, countdown descriptions, date displays, and confirmation dialogues according to the active locale.

#### Scenario: Localized days countdown in English
- **WHEN** active language is English and an item has 5 days remaining
- **THEN** system displays "5 days left" and badge "Due Soon" instead of "剩餘 5 天" / "即將到期"
