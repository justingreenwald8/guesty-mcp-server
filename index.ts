import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

const GUESTY_API_BASE = "https://open-api.guesty.com/api/v1";

// These will be provided via environment variables when JLG connects
const GUESTY_API_KEY = process.env.GUESTY_API_KEY;
const GUESTY_API_SECRET = process.env.GUESTY_API_SECRET;

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
    Authorization: \`Bearer \${GUESTY_API_KEY}\`, // Simplified for scaffold; Guesty often uses API Key/Secret or OAuth
    "Content-Type": "application/json",
  },
});

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
    switch (name) {
      case "get_guest_details": {
        const response = await apiClient.get(\`/guests-crud/\${args?.guestId}\`);
        return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
      }

      case "update_guest_concierge_notes": {
        const response = await apiClient.put(\`/guests-crud/\${args?.guestId}\`, {
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
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: "text", text: error.response?.data?.message || error.message }],
    };
  }
});

/**
 * Webhook Handler Scaffold (Express/Fastify would be used for the actual listener)
 */
/*
  // Example Webhook Logic for reservation.new / reservation.updated
  app.post('/webhooks/guesty', (req, res) => {
    const { event, reservation } = req.body;
    if (event === 'reservation.new') {
      console.log('New Reservation:', reservation._id);
    } else if (event === 'reservation.updated') {
      console.log('Reservation Updated:', reservation._id);
    }
    res.status(200).send('OK');
  });
*/

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Guesty MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
