import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const content = fs.readFileSync('.env.production', 'utf8');
const env = {};
content.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const OFFICIAL_EMAILS = [
  'admin@gebyarbulanbahasa.id',
  'acara@gebyarbulanbahasa.id',
  'media@gebyarbulanbahasa.id',
  'juri.bambang@gebyarbulanbahasa.id',
  'juri.bimo@gebyarbulanbahasa.id',
  'juri.rina@gebyarbulanbahasa.id',
  'juri.yudi@gebyarbulanbahasa.id',
  'juri.jali@gebyarbulanbahasa.id',
  'juri.dewi@gebyarbulanbahasa.id',
  'juri.siti@gebyarbulanbahasa.id'
];

async function cleanup() {
  console.log('--- STARTING CLEANUP OF TEST DATA ---');

  // 1. Delete all assessment_scores (testing jury scoring details)
  console.log('1. Deleting assessment_scores...');
  const { data: delScores, error: errScores } = await supabase
    .from('assessment_scores')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select();
  if (errScores) console.error('Error deleting assessment_scores:', errScores);
  else console.log(`Deleted ${delScores?.length ?? 0} assessment_scores records.`);

  // 2. Delete all assessments (testing jury assessments)
  console.log('2. Deleting assessments...');
  const { data: delAssessments, error: errAssessments } = await supabase
    .from('assessments')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select();
  if (errAssessments) console.error('Error deleting assessments:', errAssessments);
  else console.log(`Deleted ${delAssessments?.length ?? 0} assessments records.`);

  // 3. Delete all registrations (testing registrations)
  console.log('3. Deleting registrations...');
  const { data: delRegs, error: errRegs } = await supabase
    .from('registrations')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select();
  if (errRegs) console.error('Error deleting registrations:', errRegs);
  else console.log(`Deleted ${delRegs?.length ?? 0} registrations records.`);

  // 4. Delete all participants (testing participants)
  console.log('4. Deleting participants...');
  const { data: delParticipants, error: errParticipants } = await supabase
    .from('participants')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select();
  if (errParticipants) console.error('Error deleting participants:', errParticipants);
  else console.log(`Deleted ${delParticipants?.length ?? 0} participants records.`);

  // 5. Delete test profiles & test auth users
  console.log('5. Cleaning up test auth users and profiles...');
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const testUsers = (authUsers?.users || []).filter(u => !OFFICIAL_EMAILS.includes(u.email?.toLowerCase()));

  console.log(`Found ${testUsers.length} test users to delete from auth & profiles.`);
  for (const user of testUsers) {
    console.log(`Deleting user: ${user.email} (${user.id})`);
    
    // Delete profile if not auto-cascaded
    await supabase.from('profiles').delete().eq('id', user.id);
    
    // Delete auth user
    const { error: authErr } = await supabase.auth.admin.deleteUser(user.id);
    if (authErr) {
      console.error(`Failed to delete auth user ${user.email}:`, authErr);
    } else {
      console.log(`Deleted auth user ${user.email}`);
    }
  }

  // Double check profiles
  const { data: leftoverProfiles } = await supabase
    .from('profiles')
    .select('*')
    .not('email', 'in', `(${OFFICIAL_EMAILS.map(e => `"${e}"`).join(',')})`);
  
  if (leftoverProfiles && leftoverProfiles.length > 0) {
    console.log(`Deleting ${leftoverProfiles.length} leftover non-official profiles...`);
    for (const p of leftoverProfiles) {
      await supabase.from('profiles').delete().eq('id', p.id);
    }
  }

  console.log('--- CLEANUP COMPLETED ---');

  // Verification
  const { count: countPart } = await supabase.from('participants').select('*', { count: 'exact', head: true });
  const { count: countReg } = await supabase.from('registrations').select('*', { count: 'exact', head: true });
  const { count: countAss } = await supabase.from('assessments').select('*', { count: 'exact', head: true });
  const { count: countScores } = await supabase.from('assessment_scores').select('*', { count: 'exact', head: true });
  const { data: finalProfiles } = await supabase.from('profiles').select('id, full_name, email, role');

  console.log('=== VERIFICATION RESULTS ===');
  console.log(`Participants count: ${countPart}`);
  console.log(`Registrations count: ${countReg}`);
  console.log(`Assessments count: ${countAss}`);
  console.log(`Assessment Scores count: ${countScores}`);
  console.log(`Remaining Profiles (${finalProfiles?.length}):`);
  console.log(JSON.stringify(finalProfiles, null, 2));
}

cleanup().catch(console.error);
