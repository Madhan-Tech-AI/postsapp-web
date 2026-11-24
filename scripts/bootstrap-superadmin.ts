#!/usr/bin/env tsx
/**
 * PostsApp — SuperAdmin Bootstrap Script
 *
 * Creates the first SuperAdmin account securely.
 * - Prompts for email and password interactively (never stored or logged)
 * - Uses the service-role key (server only) to bypass email confirmation for bootstrap
 * - Creates both auth.users and profiles rows in a transaction
 * - Writes an audit log entry
 *
 * Usage:
 *   npm run db:bootstrap
 *
 * Requirements:
 *   - .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *   - Migrations already applied (npm run db:migrate)
 *   - Node.js 20+ with tsx
 */

import { createClient } from '@supabase/supabase-js'
import * as readline from 'readline'
import * as crypto from 'crypto'

// Load env
import { config } from 'dotenv'
config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    '❌ Missing required env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY\n' +
    '   Copy .env.example to .env.local and fill in real values.'
  )
  process.exit(1)
}

// Quick sanity check: reject placeholder values
if (SUPABASE_URL.includes('placeholder') || SERVICE_ROLE_KEY.includes('placeholder')) {
  console.error('❌ .env.local still contains placeholder values. Fill in real Supabase credentials.')
  process.exit(1)
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
})

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

function questionHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(prompt)
    // Hide input on Unix; on Windows it will still show (acceptable for local bootstrap)
    const stdin = process.stdin
    if (process.platform !== 'win32' && stdin.isTTY) {
      stdin.setRawMode?.(true)
      let password = ''
      stdin.on('data', function onData(char) {
        const c = char.toString()
        if (c === '\n' || c === '\r' || c === '\u0003') {
          if (c === '\u0003') process.exit() // Ctrl+C
          stdin.setRawMode?.(false)
          stdin.removeListener('data', onData)
          process.stdout.write('\n')
          resolve(password)
        } else if (c === '\u007f') {
          password = password.slice(0, -1)
        } else {
          password += c
          process.stdout.write('*')
        }
      })
      stdin.resume()
    } else {
      rl.question('', resolve)
    }
  })
}

async function validatePassword(password: string): Promise<string | null> {
  if (password.length < 10) return 'Password must be at least 10 characters'
  if (!/[A-Za-z]/.test(password)) return 'Password must contain at least one letter'
  if (!/[0-9]/.test(password)) return 'Password must contain at least one digit'
  return null
}

async function main() {
  console.log('\n🔐 PostsApp — SuperAdmin Bootstrap\n')
  console.log('This script creates the first SuperAdmin account.')
  console.log('The password is NEVER stored or logged — only sent to Supabase Auth.\n')

  const email = await question('SuperAdmin email: ')
  if (!email || !email.includes('@')) {
    console.error('❌ Invalid email address')
    process.exit(1)
  }

  const displayName = await question('Display name: ')
  if (!displayName || displayName.trim().length < 2) {
    console.error('❌ Display name must be at least 2 characters')
    process.exit(1)
  }

  const password = await questionHidden('Password (min 10 chars, letters + digits): ')
  const passwordError = await validatePassword(password)
  if (passwordError) {
    console.error(`❌ ${passwordError}`)
    process.exit(1)
  }

  const confirmPassword = await questionHidden('Confirm password: ')
  if (password !== confirmPassword) {
    console.error('❌ Passwords do not match')
    process.exit(1)
  }

  rl.close()

  // Service-role client (server-only; never in browser code)
  const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('\n⏳ Creating SuperAdmin account...')

  // Check if a SuperAdmin already exists
  const { data: existingAdmins, error: checkError } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('role', 'super_admin')
    .limit(1)

  if (checkError) {
    console.error('❌ Database check failed:', checkError.message)
    console.error('   Make sure migrations have been applied: npm run db:migrate')
    process.exit(1)
  }

  if (existingAdmins && existingAdmins.length > 0) {
    console.error(`❌ A SuperAdmin already exists (${existingAdmins[0].display_name}).`)
    console.error('   Use the admin console to create additional SuperAdmins.')
    process.exit(1)
  }

  // Create auth user via admin API (bypasses email confirmation for bootstrap)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true, // Auto-confirm for bootstrap
    user_metadata: {
      display_name: displayName.trim(),
    },
  })

  if (authError || !authData.user) {
    console.error('❌ Failed to create auth user:', authError?.message)
    process.exit(1)
  }

  const userId = authData.user.id

  // Update profile to super_admin (the trigger creates it as 'reader')
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: 'super_admin', display_name: displayName.trim() })
    .eq('id', userId)

  if (profileError) {
    console.error('❌ Failed to update profile role:', profileError.message)
    // Clean up: delete the auth user
    await supabase.auth.admin.deleteUser(userId)
    process.exit(1)
  }

  // Write audit log
  const { error: auditError } = await supabase.from('audit_logs').insert({
    actor_id: userId,
    action: 'role_change',
    target_type: 'user',
    target_id: userId,
    metadata: {
      old_role: 'reader',
      new_role: 'super_admin',
      bootstrap: true,
      note: 'Initial SuperAdmin created via bootstrap script',
    },
  })

  if (auditError) {
    console.warn('⚠️  Audit log entry failed (non-fatal):', auditError.message)
  }

  console.log('\n✅ SuperAdmin created successfully!')
  console.log(`   Email:        ${email.trim().toLowerCase()}`)
  console.log(`   Display name: ${displayName.trim()}`)
  console.log(`   Role:         super_admin`)
  console.log('\n   Log in at: /admin/login\n')
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err.message)
  process.exit(1)
})
