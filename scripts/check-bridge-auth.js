#!/usr/bin/env node

/**
 * Bridge Authentication Diagnostic Script
 * 
 * Run this to check your Bridge authentication setup:
 * node scripts/check-bridge-auth.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkBridgeAuth() {
  console.log('\n🔍 Bridge Authentication Diagnostic\n');
  console.log('=' .repeat(50));
  
  // 1. Check environment variables
  console.log('\n1️⃣ Environment Variables:');
  const requiredEnvVars = [
    'NEXT_PUBLIC_SITE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  
  let allEnvVarsPresent = true;
  for (const envVar of requiredEnvVars) {
    const isPresent = !!process.env[envVar];
    console.log(`   ${isPresent ? '✅' : '❌'} ${envVar}: ${isPresent ? 'Set' : 'MISSING'}`);
    if (!isPresent) allEnvVarsPresent = false;
  }
  
  if (!allEnvVarsPresent) {
    console.log('\n❌ Missing required environment variables. Please check your .env.local file.');
    process.exit(1);
  }
  
  // 2. Check Supabase connection
  console.log('\n2️⃣ Supabase Connection:');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('   ❌ Cannot test connection - missing credentials');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const { data, error } = await supabase.from('studios').select('count', { count: 'exact', head: true });
    if (error) throw error;
    console.log('   ✅ Connected to Supabase successfully');
  } catch (err) {
    console.log(`   ❌ Failed to connect: ${err.message}`);
    process.exit(1);
  }
  
  // 3. Check for client users
  console.log('\n3️⃣ Client Users:');
  try {
    const { data: clientUsers, error } = await supabase
      .from('client_users')
      .select('id, email, status, client_id, studio_id')
      .limit(10);
    
    if (error) throw error;
    
    if (clientUsers && clientUsers.length > 0) {
      console.log(`   ✅ Found ${clientUsers.length} client user(s)`);
      clientUsers.forEach((user, idx) => {
        console.log(`      ${idx + 1}. ${user.email} (status: ${user.status})`);
      });
    } else {
      console.log('   ⚠️  No client users found. Invite a client to test.');
    }
  } catch (err) {
    console.log(`   ❌ Error checking client users: ${err.message}`);
  }
  
  // 4. Check redirect URL configuration
  console.log('\n4️⃣ Redirect URL Configuration:');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const expectedRedirectUrls = [
    `${siteUrl}/bridge/verify`,
    `${siteUrl}/api/auth/callback`,
  ];
  
  console.log(`   📍 Site URL: ${siteUrl}`);
  console.log('\n   Expected redirect URLs in Supabase:');
  expectedRedirectUrls.forEach(url => {
    console.log(`      - ${url}`);
  });
  
  console.log('\n   ⚠️  IMPORTANT: You must manually add these URLs to:');
  console.log('      Supabase Dashboard → Authentication → URL Configuration → Redirect URLs');
  console.log(`      https://supabase.com/dashboard/project/${supabaseUrl.split('//')[1].split('.')[0]}/auth/url-configuration`);
  
  // 5. Test magic link flow
  console.log('\n5️⃣ Magic Link Test:');
  console.log('   To test the magic link flow:');
  console.log('   1. Navigate to: /dashboard/clients/[CLIENT_ID]');
  console.log('   2. Click "Invite Client User"');
  console.log('   3. Enter a real email you can access');
  console.log('   4. Check your email for the magic link');
  console.log('   5. Click the link - it should redirect through /bridge/verify');
  console.log('   6. Check browser console for verification logs (🔑, ✅, ❌)');
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ Basic setup looks good!');
  console.log('\n📋 Next Steps:');
  console.log('   1. Add redirect URLs to Supabase (see section 4 above)');
  console.log('   2. Invite a test client user');
  console.log('   3. Check the magic link in your email');
  console.log('   4. Monitor browser console during verification');
  console.log('\n💡 Tip: Run with DEBUG=* for verbose logging');
  console.log('');
}

checkBridgeAuth().catch((err) => {
  console.error('\n❌ Diagnostic failed:', err);
  process.exit(1);
});

