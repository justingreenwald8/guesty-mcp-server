# Guesty-MCP Simulation Flow

This document outlines how a guest message or check-in event flows through the system to update the staff backend.

## 1. Guest Event (Input)
A guest (e.g., Justin Greenwald, ID: `guest_123`) sends a message or performs an action (like checking in).

## 2. Processing (MCP Server)
The `guesty-mcp-server` handles the logic.
- **Mock Mode**: If no API keys are found, it reads/writes to `mock-pms.json`.
- **Production Mode**: It communicates with the Guesty Open API (`https://open-api.guesty.com/api/v1`).

## 3. Tool Execution
- **`log_guest_message`**: Appends the message to the `messages` array in `mock-pms.json`.
- **`update_guest_concierge_notes`**: Updates the `goodToKnowNotes` field for the guest.

## 4. Staff Backend Visibility
Staff can see the updated concierge notes and message history via:
- The Guesty Inbox (Production).
- The `mock-pms.json` file (Simulation/Mock).
- The Reserve Desk Dashboard.
