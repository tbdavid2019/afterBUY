# Spec Delta: llm-agent-skill

## Purpose

Provides machine-readable agent skills, LLM documentation, and personalized prompt generation so external LLMs can autonomously manage consumables.

## ADDED Requirements

### Requirement: Standardized Agent Skill Specification (skill.md)
The system SHALL expose a machine-readable `skill.md` at `/skill.md` defining afterBUY's capabilities, schemas, API endpoints, lifecycle calculation rules, and few-shot examples for LLM agents.

#### Scenario: AI Agent or developer fetches skill.md
- **WHEN** client sends `GET /skill.md` or navigates to `/skill.md`
- **THEN** system returns an Markdown specification defining afterBUY capabilities, tool schemas, and curl/HTTP invocation conventions

### Requirement: Enhanced LLM Directory Index (llms.txt)
The system SHALL maintain `/llms.txt` and `/llms-full.txt` files conforming to the LLM index standard, providing concise domain context, tracking modes, and API endpoints for web-crawling LLMs.

#### Scenario: LLM crawler requests llms.txt
- **WHEN** client requests `GET /llms.txt`
- **THEN** system returns a plain text overview detailing afterBUY architecture, API endpoints, and consumable lifecycle concepts

### Requirement: OpenAPI 3.1 Specification Endpoint
The system SHALL serve an OpenAPI 3.1 compatible JSON specification at `/api/v1/openapi.json` defining all v1 Agent API paths, schemas, and Bearer authentication, suitable for direct import into ChatGPT GPTs Actions.

#### Scenario: ChatGPT or OpenAPI client fetches openapi.json
- **WHEN** client sends `GET /api/v1/openapi.json`
- **THEN** system returns a valid OpenAPI 3.1 document with all endpoints and security schemes defined

### Requirement: Personalized Agent Prompt and Integration Panel in Settings
The system SHALL provide an interactive "AI Agent Integration" section in Settings where users can view their API keys, copy ready-to-use System Prompts, and copy customized skill definitions or OpenAPI URLs with their personal credentials pre-filled.

#### Scenario: User copies customized LLM Agent Prompt
- **WHEN** authenticated user selects an API key in the AI Agent Settings section and clicks "Copy Agent Prompt"
- **THEN** system copies a formatted LLM system prompt containing the user's specific API base URL, Bearer token header, and clear natural language execution instructions to the clipboard

#### Scenario: User configures ChatGPT Action
- **WHEN** user selects ChatGPT Actions tab in Settings
- **THEN** system displays the direct OpenAPI JSON URL, the selected API Key for Authentication, and step-by-step guidance
