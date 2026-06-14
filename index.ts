import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOCK_FILE_PATH = path.join(__dirname, "mock-pms.json");

const GUESTY_API_BASE = "https://open-api.guesty.com/api/v1";

// These will be provided via environment variables when JLG connects
const GUESTY_API_KEY = process.env.GUESTY_API_KEY;
const GUESTY_API_SECRET = process.env.GUESTY_API_SECRET;

const isMockMode = !GUESTY_API_KEY || !GUESTY_API_SECRET;

const server = new Server(
  {
    name: "guesty-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const apiClient = axios.create({
  baseURL: GUESTY_API_BASE,
  headers: {
    Authorization: `Bearer ${GUESTY_API_KEY}`,
    "Content-Type": "application/json",
  },
});

/**
 * Mock Helpers
 */
async function readMockData() {
  const data = await fs.readFile(MOCK_FILE_PATH, "utf-8");
  return JSON.parse(data);
}

async function writeMockData(data: any) {
  await fs.writeFile(MOCK_FILE_PATH, JSON.stringify(data, null, 2));
}

/**
 * Tool Implementations
 */

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_guest_details",
        description: "Retrieves guest details including phone, email, and existing notes.",
        inputSchema: {
          type: "object",
          properties: {
            guestId: { type: "string", description: "The Guesty Guest ID" },
          },
          required: ["guestId"],
        },
      },
      {
        name: "update_guest_concierge_notes",
        description: "Updates the goodToKnowNotes field for a specific guest.",
        inputSchema: {
          type: "object",
          properties: {
            guestId: { type: "string", description: "The Guesty Guest ID" },
            notes: { type: "string", description: "The new notes for the guest" },
          },
          required: ["guestId", "notes"],
        },
      },
      {
        name: "log_guest_message",
        description: "Syncs a chat message to the Guesty inbox.",
        inputSchema: {
          type: "object",
          properties: {
            reservationId: { type: "string", description: "The Reservation ID" },
            body: { type: "string", description: "Message content" },
            type: { type: "string", enum: ["fromGuest", "fromHost"], default: "fromHost" },
          },
          required: ["reservationId", "body"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (isMockMode) {
      const db = await readMockData();
      switch (name) {
        case "get_guest_details": {
          const guest = db.guests[args?.guestId as string];
          if (!guest) throw new Error("Guest not found");
          return { content: [{ type: "text", text: JSON.stringify(guest) }] };
        }
        case "update_guest_concierge_notes": {
          if (!db.guests[args?.guestId as string]) throw new Error("Guest not found");
          db.guests[args?.guestId as string].goodToKnowNotes = args?.notes;
          await writeMockData(db);
          return { content: [{ type: "text", text: JSON.stringify(db.guests[args?.guestId as string]) }] };
        }
        case "log_guest_message": {
          const newMessage = {
            reservationId: args?.reservationId,
            body: args?.body,
            type: args?.type || "fromHost",
            createdAt: new Date().toISOString()
          };
          db.messages.push(newMessage);
          await writeMockData(db);
          return { content: [{ type: "text", text: JSON.stringify(newMessage) }] };
        }
        default:
          throw new Error("Tool not found");
      }
    } else {
      // Production Mode
      switch (name) {
        case "get_guest_details": {
          const response = await apiClient.get(`/guests-crud/${args?.guestId}`);
          return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
        }
        case "update_guest_concierge_notes": {
          const response = await apiClient.put(`/guests-crud/${args?.guestId}`, {
            goodToKnowNotes: args?.notes,
          });
          return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
        }
        case "log_guest_message": {
          const response = await apiClient.post("/communication/messages", {
            reservationId: args?.reservationId,
            body: args?.body,
            type: args?.type || "fromHost",
          });
          return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
        }
        default:
          throw new Error("Tool not found");
      }
    }
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: "text", text: error.response?.data?.message || error.message }],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Guesty MCP Server running on stdio (Mode: ${isMockMode ? 'MOCK' : 'PROD'})`);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
