/**
 * Seed Test Users Script
 *
 * Creates test user accounts for local development and testing.
 * This script is idempotent - safe to run multiple times.
 *
 * Test accounts created:
 * - test-studio@saltcore.dev / teststudio123 (studio_owner)
 * - test-client@saltcore.dev / testclient123 (client)
 *
 * Usage: npx tsx scripts/seed-test-users.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required environment variables:");
  console.error("  - NEXT_PUBLIC_SUPABASE_URL");
  console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface TestUser {
  email: string;
  password: string;
  role: "studio_owner" | "client";
  name: string;
}

const TEST_USERS: TestUser[] = [
  {
    email: "test-studio@saltcore.dev",
    password: "teststudio123",
    role: "studio_owner",
    name: "Test Studio Owner",
  },
  {
    email: "test-client@saltcore.dev",
    password: "testclient123",
    role: "client",
    name: "Test Client User",
  },
];

async function findOrCreateUser(
  user: TestUser
): Promise<{ id: string; isNew: boolean }> {
  // Check if user exists
  const { data: existingUsers, error: listError } =
    await supabase.auth.admin.listUsers();

  if (listError || !existingUsers) {
    throw new Error(`Failed to list users: ${listError?.message ?? "Unknown error"}`);
  }

  const existing = existingUsers.users.find((u) => u.email === user.email);

  if (existing) {
    console.log(`  User ${user.email} already exists (id: ${existing.id})`);
    return { id: existing.id, isNew: false };
  }

  // Create user
  const { data: newUser, error: createError } =
    await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        name: user.name,
      },
    });

  if (createError) {
    throw new Error(`Failed to create user ${user.email}: ${createError.message}`);
  }

  console.log(`  Created user ${user.email} (id: ${newUser.user.id})`);
  return { id: newUser.user.id, isNew: true };
}

async function ensureStudioExists(userId: string): Promise<string> {
  // Check if user already has a studio
  const { data: existingStudio, error: studioError } = await supabase
    .from("studios")
    .select("id, name")
    .eq("owner_id", userId)
    .single();

  if (existingStudio) {
    console.log(`  Studio already exists: ${existingStudio.name}`);
    return existingStudio.id;
  }

  // Studio should be auto-created by trigger, but let's verify and create if needed
  if (studioError && studioError.code === "PGRST116") {
    // No studio found, create one
    const { data: newStudio, error: createError } = await supabase
      .from("studios")
      .insert({
        owner_id: userId,
        name: "Test Studio",
        slug: `test-studio-${userId.slice(0, 8)}`,
      })
      .select("id")
      .single();

    if (createError) {
      throw new Error(`Failed to create studio: ${createError.message}`);
    }

    console.log(`  Created studio: Test Studio`);

    // Create studio member entry
    const { error: memberError } = await supabase.from("studio_members").insert({
      studio_id: newStudio.id,
      user_id: userId,
      role: "owner",
      email: "test-studio@saltcore.dev",
    });

    if (memberError && memberError.code !== "23505") {
      // Ignore duplicate key errors
      throw new Error(`Failed to create studio member: ${memberError.message}`);
    }

    return newStudio.id;
  }

  throw new Error(`Failed to check studio: ${studioError?.message}`);
}

async function ensureClientExists(studioId: string): Promise<string> {
  // Check if client already exists for this studio
  const { data: existingClient, error: clientError } = await supabase
    .from("clients")
    .select("id, name")
    .eq("studio_id", studioId)
    .eq("name", "Test Client")
    .single();

  if (existingClient) {
    console.log(`  Client already exists: ${existingClient.name}`);
    return existingClient.id;
  }

  // Create client
  if (clientError && clientError.code === "PGRST116") {
    const { data: newClient, error: createError } = await supabase
      .from("clients")
      .insert({
        studio_id: studioId,
        name: "Test Client",
        slug: "test-client",
        contact_email: "test-client@saltcore.dev",
      })
      .select("id")
      .single();

    if (createError) {
      throw new Error(`Failed to create client: ${createError.message}`);
    }

    console.log(`  Created client: Test Client`);
    return newClient.id;
  }

  throw new Error(`Failed to check client: ${clientError?.message}`);
}

async function ensureClientUserExists(
  clientId: string,
  userId: string
): Promise<void> {
  // Check if client_user already exists
  const { data: existingClientUser, error: checkError } = await supabase
    .from("client_users")
    .select("id")
    .eq("client_id", clientId)
    .eq("user_id", userId)
    .single();

  if (existingClientUser) {
    console.log(`  Client user link already exists`);
    return;
  }

  // Create client_user link
  if (checkError && checkError.code === "PGRST116") {
    const { error: createError } = await supabase.from("client_users").insert({
      client_id: clientId,
      user_id: userId,
      role: "client",
      email: "test-client@saltcore.dev",
      status: "active",
    });

    if (createError && createError.code !== "23505") {
      throw new Error(`Failed to link client user: ${createError.message}`);
    }

    console.log(`  Linked client user to client`);
    return;
  }

  throw new Error(`Failed to check client user: ${checkError?.message}`);
}

async function main() {
  console.log("Seeding test users...\n");

  let studioUserId: string | null = null;
  let clientUserId: string | null = null;
  let studioId: string | null = null;

  // Create test users
  for (const user of TEST_USERS) {
    console.log(`Processing ${user.role}: ${user.email}`);
    try {
      const { id } = await findOrCreateUser(user);

      if (user.role === "studio_owner") {
        studioUserId = id;
      } else {
        clientUserId = id;
      }
    } catch (error) {
      console.error(`  Error: ${error}`);
      process.exit(1);
    }
  }

  // Ensure studio exists for studio owner
  if (studioUserId) {
    console.log("\nSetting up studio...");
    try {
      studioId = await ensureStudioExists(studioUserId);
    } catch (error) {
      console.error(`  Error: ${error}`);
      process.exit(1);
    }
  }

  // Create client and link client user
  if (studioId && clientUserId) {
    console.log("\nSetting up client...");
    try {
      const clientId = await ensureClientExists(studioId);
      await ensureClientUserExists(clientId, clientUserId);
    } catch (error) {
      console.error(`  Error: ${error}`);
      process.exit(1);
    }
  }

  console.log("\n✓ Test users seeded successfully!");
  console.log("\nTest accounts:");
  console.log("  Studio Owner: test-studio@saltcore.dev / teststudio123");
  console.log("  Client User:  test-client@saltcore.dev / testclient123");
  console.log("\nLogin at: http://localhost:3000/dev-login");
}

main();
