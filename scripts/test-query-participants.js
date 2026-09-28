const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.production', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    value = value.trim().replace(/^['"](.*)['"]$/, '$1');
    env[match[1]] = value;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase
    .from('participants')
    .select(`
      id,
      registration_number,
      full_name,
      nickname,
      email,
      phone,
      institution,
      status,
      total_points,
      rejection_reason,
      created_at,
      registrations (
        id,
        team_name,
        is_confirmed,
        competition_id,
        competitions (
          id,
          name,
          slug,
          type
        ),
        registration_members (
          id,
          member_name,
          member_role
        )
      ),
      participant_documents (
        id,
        doc_type,
        file_name,
        file_url,
        status
      )
    `)
    .order('created_at', { ascending: false });

  console.log('Error:', error);
  console.log('Result count:', data?.length);
  if (data) {
    data.forEach(d => {
      console.log('Peserta:', {
        id: d.id,
        regNo: d.registration_number,
        name: d.full_name,
        status: d.status,
        regs: d.registrations
      });
    });
  }
}
test();
