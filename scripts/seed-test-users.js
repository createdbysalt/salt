#!/usr/bin/env node

/**
 * Seed Test Users for Browser Testing
 *
 * Creates test accounts for browser testing.
 * Run with: node scripts/seed-test-users.js
 *
 * This script creates:
 * 1. A studio user (for app testing)
 * 2. A studio and a test project for that user
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Test credentials - use these in browser testing
const TEST_STUDIO_USER = {
  email: 'test-studio@saltcore.dev',
  password: 'teststudio123',
  name: 'Test Studio User',
};

async function seedTestUsers() {
  console.log('\n🌱 Seeding Test Users for Browser Testing\n');
  console.log('='.repeat(50));

  // Validate environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    console.error('   Make sure your .env.local file is configured.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // =========================================================================
    // STEP 1: Create or get studio user
    // =========================================================================
    console.log('\n1️⃣ Setting up Studio User...');

    let studioUserId;

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingStudioUser = existingUsers?.users?.find(u => u.email === TEST_STUDIO_USER.email);

    if (existingStudioUser) {
      console.log(`   ✅ Studio user already exists: ${TEST_STUDIO_USER.email}`);
      studioUserId = existingStudioUser.id;

      // Update password to ensure it's correct
      await supabase.auth.admin.updateUserById(studioUserId, {
        password: TEST_STUDIO_USER.password,
      });
      console.log('   ✅ Password updated to known test value');
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: TEST_STUDIO_USER.email,
        password: TEST_STUDIO_USER.password,
        email_confirm: true,
        user_metadata: { name: TEST_STUDIO_USER.name },
      });

      if (createError) {
        throw new Error(`Failed to create studio user: ${createError.message}`);
      }

      studioUserId = newUser.user.id;
      console.log(`   ✅ Created studio user: ${TEST_STUDIO_USER.email}`);
    }

    // =========================================================================
    // STEP 2: Ensure studio exists for this user
    // =========================================================================
    console.log('\n2️⃣ Setting up Studio...');

    let { data: studio } = await supabase
      .from('studios')
      .select('id, name, slug')
      .eq('owner_id', studioUserId)
      .single();

    if (!studio) {
      // The trigger should have created it, but let's create manually if needed
      const { data: newStudio, error: studioError } = await supabase
        .from('studios')
        .insert({
          owner_id: studioUserId,
          name: 'Test Studio',
          slug: 'test-studio-' + studioUserId.substring(0, 8),
        })
        .select()
        .single();

      if (studioError) {
        throw new Error(`Failed to create studio: ${studioError.message}`);
      }

      studio = newStudio;

      // Also create studio_member
      await supabase.from('studio_members').insert({
        studio_id: studio.id,
        user_id: studioUserId,
        role: 'owner',
        email: TEST_STUDIO_USER.email,
      });

      console.log(`   ✅ Created studio: ${studio.name}`);
    } else {
      console.log(`   ✅ Studio exists: ${studio.name}`);
    }

    // =========================================================================
    // STEP 3: Create a test project
    // =========================================================================
    console.log('\n3️⃣ Setting up Test Project...');

    const { data: existingProject } = await supabase
      .from('projects')
      .select('id, name')
      .eq('studio_id', studio.id)
      .eq('slug', 'test-project')
      .single();

    if (!existingProject) {
      const { error: projectError } = await supabase
        .from('projects')
        .insert({
          studio_id: studio.id,
          name: 'Test Project',
          slug: 'test-project',
          description: 'A test project for browser testing',
          status: 'active',
        });

      if (projectError) {
        console.log(`   ⚠️ Could not create project: ${projectError.message}`);
      } else {
        console.log('   ✅ Created test project');
      }
    } else {
      console.log(`   ✅ Test project exists: ${existingProject.name}`);
    }

    // =========================================================================
    // SUCCESS OUTPUT
    // =========================================================================
    console.log('\n' + '='.repeat(50));
    console.log('✅ Test users seeded successfully!\n');

    console.log('📋 TEST CREDENTIALS:\n');

    console.log('   Login URL: http://localhost:3000/dev-login\n');

    console.log('   Studio User:');
    console.log(`   Email:    ${TEST_STUDIO_USER.email}`);
    console.log(`   Password: ${TEST_STUDIO_USER.password}`);

    console.log('\n📍 IDs for reference:');
    console.log(`   Studio ID:      ${studio.id}`);
    console.log(`   Studio User ID: ${studioUserId}`);

    console.log('\n💡 Usage in PRD browser testing:');
    console.log('   1. Run: npm run seed:test-users');
    console.log('   2. Start dev server: npm run dev (must be on localhost:3000)');
    console.log('   3. Navigate to: http://localhost:3000/dev-login');
    console.log('   4. Click "Studio User" to auto-fill, then Sign In');
    console.log('');

  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seedTestUsers();
