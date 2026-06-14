import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOCK_FILE_PATH = path.join(__dirname, 'mock-pms.json');

async function readMockData() {
  const data = await fs.readFile(MOCK_FILE_PATH, 'utf-8');
  return JSON.parse(data);
}

async function writeMockData(data: any) {
  await fs.writeFile(MOCK_FILE_PATH, JSON.stringify(data, null, 2));
}

/**
 * Simplified Tool Handlers for Simulation Testing
 * (Mimicking index.ts logic)
 */

async function log_guest_message(reservationId: string, body: string, type: string = 'fromGuest') {
  console.log(`[SIMULATION] Logging guest message: "${body}" for Reservation: ${reservationId}`);
  const db = await readMockData();
  const newMessage = {
    reservationId,
    body,
    type,
    createdAt: new Date().toISOString()
  };
  db.messages.push(newMessage);
  await writeMockData(db);
  return newMessage;
}

async function update_guest_concierge_notes(guestId: string, notes: string) {
  console.log(`[SIMULATION] Updating Concierge Notes for Guest: ${guestId}`);
  const db = await readMockData();
  if (!db.guests[guestId]) throw new Error("Guest not found");
  db.guests[guestId].goodToKnowNotes = notes;
  await writeMockData(db);
  return db.guests[guestId];
}

async function runSimulation() {
  console.log("--- STARTING GUESTY MCP SIMULATION ---\n");

  const GUEST_ID = "guest_123";
  const RES_ID = "res_456";

  // 1. Initial State
  let db = await readMockData();
  console.log("Initial Notes:", db.guests[GUEST_ID].goodToKnowNotes);
  console.log("Initial Message Count:", db.messages.length);

  // 2. Simulate Guest Request: Extra Towels
  console.log("\nScenario 1: Guest requests extra towels via text.");
  await log_guest_message(RES_ID, "Hi, can we get 4 extra towels sent to the room?");
  
  // 3. Process Business Logic: Update Concierge Notes
  const currentNotes = db.guests[GUEST_ID].goodToKnowNotes;
  const newNotes = `${currentNotes}\n- Requested 4 extra towels (Sunday, June 14, 2026)`;
  await update_guest_concierge_notes(GUEST_ID, newNotes);

  // 4. Simulate Guest Check-In Update
  console.log("\nScenario 2: Guest checks in early.");
  await log_guest_message(RES_ID, "Checking in now! The lodge looks beautiful.");
  
  // 5. Final Verification
  const finalDb = await readMockData();
  console.log("\n--- SIMULATION COMPLETE ---");
  console.log("Final Message Count:", finalDb.messages.length);
  console.log("Updated Concierge Notes:");
  console.log(finalDb.guests[GUEST_ID].goodToKnowNotes);
}

runSimulation().catch(err => {
  console.error("Simulation failed:", err);
  process.exit(1);
});
