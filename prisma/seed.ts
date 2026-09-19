import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const localDbPath = path.join(process.cwd(), 'data', 'local_db.json');
  if (!fs.existsSync(localDbPath)) {
    console.log('No local_db.json found to seed from.');
    return;
  }

  const raw = fs.readFileSync(localDbPath, 'utf-8');
  const db = JSON.parse(raw);

  console.log('Seeding Prisma database from data/local_db.json...');

  // 1. Admins
  for (const admin of db.admins || []) {
    await prisma.admin.upsert({
      where: { username: admin.username },
      update: {},
      create: {
        id: admin.id,
        username: admin.username,
        password_hash: admin.password_hash,
        name: admin.name,
      },
    });
  }

  // 2. Generations
  for (const gen of db.generations || []) {
    await prisma.generation.upsert({
      where: { id: gen.id },
      update: {
        name: gen.name,
        order_index: gen.order_index,
        is_active: gen.is_active,
      },
      create: {
        id: gen.id,
        name: gen.name,
        order_index: gen.order_index,
        is_active: gen.is_active,
      },
    });
  }

  // 3. Members
  for (const mem of db.members || []) {
    // Check if generation exists
    const genExists = await prisma.generation.findUnique({ where: { id: mem.generation_id } });
    if (genExists) {
      await prisma.member.upsert({
        where: { id: mem.id },
        update: {
          name: mem.name,
          phone: mem.phone,
          is_active: mem.is_active,
        },
        create: {
          id: mem.id,
          generation_id: mem.generation_id,
          name: mem.name,
          phone: mem.phone,
          is_active: mem.is_active,
        },
      });
    }
  }

  // 4. Checkers
  for (const c of db.checkers || []) {
    await prisma.checker.upsert({
      where: { id: c.id },
      update: {
        name: c.name,
        pin_hash: c.pin_hash,
        is_active: c.is_active,
      },
      create: {
        id: c.id,
        name: c.name,
        pin_hash: c.pin_hash,
        is_active: c.is_active,
      },
    });
  }

  // 5. Items & Accessories
  for (const item of db.items || []) {
    await prisma.item.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        code: item.code,
        description: item.description,
        status: item.status,
      },
      create: {
        id: item.id,
        name: item.name,
        code: item.code,
        description: item.description,
        status: item.status,
      },
    });

    for (const acc of item.accessories || []) {
      await prisma.itemAccessory.upsert({
        where: { id: acc.id },
        update: {
          name: acc.name,
          is_required: acc.is_required,
        },
        create: {
          id: acc.id,
          item_id: item.id,
          name: acc.name,
          is_required: acc.is_required,
        },
      });
    }
  }

  // 6. WhatsApp Config
  for (const cfg of db.whatsapp_configs || []) {
    await prisma.whatsAppConfig.upsert({
      where: { id: cfg.id || 'default' },
      update: {
        target_group_jid: cfg.target_group_jid,
        target_group_name: cfg.target_group_name,
        is_connected: cfg.is_connected,
        phone_number: cfg.phone_number,
      },
      create: {
        id: cfg.id || 'default',
        target_group_jid: cfg.target_group_jid,
        target_group_name: cfg.target_group_name,
        is_connected: cfg.is_connected,
        phone_number: cfg.phone_number,
      },
    });
  }

  console.log('✅ Prisma database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
