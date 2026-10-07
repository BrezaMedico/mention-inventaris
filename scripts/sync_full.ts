import { supabase } from '../lib/supabase/client';
import fs from 'fs';
import path from 'path';

async function syncAll() {
  console.log('Starting full synchronization from Supabase...');

  const [
    { data: admins, error: adminErr },
    { data: generations, error: genErr },
    { data: members, error: memErr },
    { data: checkers, error: checkErr },
    { data: items, error: itemErr },
    { data: item_accessories, error: accErr },
    { data: loans, error: loanErr },
    { data: loan_items, error: liErr },
    { data: notification_events, error: notifErr },
    { data: whatsapp_configs, error: waErr },
    { data: overdue_reminders, error: ovErr },
    { data: tasks, error: taskErr },
  ] = await Promise.all([
    supabase.from('admins').select('*'),
    supabase.from('generations').select('*'),
    supabase.from('members').select('*'),
    supabase.from('checkers').select('*'),
    supabase.from('items').select('*'),
    supabase.from('item_accessories').select('*'),
    supabase.from('loans').select('*'),
    supabase.from('loan_items').select('*'),
    supabase.from('notification_events').select('*'),
    supabase.from('whatsapp_configs').select('*'),
    supabase.from('overdue_reminders').select('*'),
    supabase.from('tasks').select('*'),
  ]);

  // Read existing tasks from local DB in case table does not exist yet on remote Supabase
  let existingTasks: any[] = [];
  try {
    const existingDb = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'local_db.json'), 'utf-8'));
    if (existingDb.tasks) existingTasks = existingDb.tasks;
  } catch {}

  const localDb = {
    admins: admins || [],
    generations: generations || [],
    members: members || [],
    checkers: checkers || [],
    items: items || [],
    item_accessories: item_accessories || [],
    loans: loans || [],
    loan_items: loan_items || [],
    notification_events: notification_events || [],
    whatsapp_configs: whatsapp_configs || [],
    overdue_reminders: overdue_reminders || [],
    tasks: tasks && tasks.length > 0 ? tasks : existingTasks,
  };

  const dbPath = path.join(process.cwd(), 'data', 'local_db.json');
  fs.writeFileSync(dbPath, JSON.stringify(localDb, null, 2), 'utf-8');

  console.log('Successfully synced data to data/local_db.json!');
  console.log('Counts:');
  console.log('- admins:', localDb.admins.length);
  console.log('- generations:', localDb.generations.length);
  console.log('- members:', localDb.members.length);
  console.log('- checkers:', localDb.checkers.length);
  console.log('- items:', localDb.items.length);
  console.log('- item_accessories:', localDb.item_accessories.length);
  console.log('- loans:', localDb.loans.length);
  console.log('- loan_items:', localDb.loan_items.length);
  console.log('- notification_events:', localDb.notification_events.length);
  console.log('- whatsapp_configs:', localDb.whatsapp_configs.length);
}

syncAll().then(() => process.exit(0)).catch(console.error);
