import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client/index.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function requirePassword(value, label) {
  if (!value || value.length < 12) {
    throw new Error(`${label} must be set to at least 12 characters.`);
  }

  return value;
}

async function createIfMissing({ email, password, name, role }, resetPassword = false) {
  const normalized = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalized } });

  if (existing) {
    if (resetPassword) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash: await bcrypt.hash(password, 12) },
      });
      console.log(`reset password for ${normalized}`);
    } else {
      console.log(`skipped ${normalized} (already exists)`);
    }
    return;
  }

  await prisma.user.create({
    data: {
      email: normalized,
      passwordHash: await bcrypt.hash(password, 12),
      name,
      role,
    },
  });

  console.log(`created ${normalized} (${role})`);
}

const TECHNOLOGIES = [
  { slug: 'c', name: 'C', category: 'language', fileExtension: '.c', description: 'Procedural programming with GCC.' },
  { slug: 'cpp', name: 'C++', category: 'language', fileExtension: '.cpp', description: 'C++20 with the GCC toolchain.' },
  { slug: 'java', name: 'Java', category: 'language', fileExtension: '.java', description: 'Java on the JDK.' },
  { slug: 'csharp', name: 'C#', category: 'language', fileExtension: '.cs', description: 'C# on the .NET SDK.' },
  { slug: 'python', name: 'Python', category: 'language', fileExtension: '.py', description: 'Python 3 for scripting and algorithms.' },
  { slug: 'go', name: 'Go', category: 'language', fileExtension: '.go', description: 'Go compiled with go build.' },
  { slug: 'ruby', name: 'Ruby', category: 'language', fileExtension: '.rb', description: 'Ruby interpreter.' },
  { slug: 'swift', name: 'Swift', category: 'language', fileExtension: '.swift', description: 'Swift compiler.' },
  { slug: 'git', name: 'Git', category: 'devops', fileExtension: '.sh', description: 'Git practice in a live terminal.' },
  { slug: 'linux', name: 'Linux', category: 'devops', fileExtension: '.sh', description: 'Linux command line in a live terminal.' },
  { slug: 'docker', name: 'Docker', category: 'devops', fileExtension: '.sh', description: 'Docker practice in a live terminal.' },
  { slug: 'kubernetes', name: 'Kubernetes', category: 'devops', fileExtension: '.sh', description: 'Kubernetes practice in a live terminal.' },
  { slug: 'cicd', name: 'CI/CD', category: 'devops', fileExtension: '.sh', description: 'CI/CD pipelines in a live terminal.' },
];

async function seedTechnologies() {
  for (const tech of TECHNOLOGIES) {
    const existing = await prisma.technology.findUnique({ where: { slug: tech.slug } });

    if (existing) {
      if (!existing.judgeLanguage) {
        await prisma.technology.update({ where: { id: existing.id }, data: { judgeLanguage: tech.slug } });
      }
      console.log(`skipped technology ${tech.slug} (already exists)`);
      continue;
    }

    await prisma.technology.create({
      data: {
        ...tech,
        status: 'active',
        runtimeImage: `elab-judge-${tech.slug}:latest`,
        judgeLanguage: tech.slug,
      },
    });

    console.log(`created technology ${tech.slug}`);
  }
}

async function main() {
  const accounts = [];

  if (process.env.SEED_SUPERADMIN_EMAIL) {
    accounts.push({
      email: process.env.SEED_SUPERADMIN_EMAIL,
      password: requirePassword(process.env.SEED_SUPERADMIN_PASSWORD, 'SEED_SUPERADMIN_PASSWORD'),
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
    });
  }

  const resetDemo = process.env.SEED_DEMO_RESET_PASSWORDS === 'true';
  const demo = [];

  if (process.env.SEED_DEMO === 'true') {
    const shared = process.env.SEED_DEMO_PASSWORD;
    const pick = (key) => requirePassword(process.env[key] || shared, `${key} (or SEED_DEMO_PASSWORD)`);

    demo.push(
      { email: 'superadmin@elab.com', password: pick('SEED_DEMO_SUPERADMIN_PASSWORD'), name: 'Demo Super Admin', role: 'SUPER_ADMIN' },
      { email: 'platformadmin@elab.com', password: pick('SEED_DEMO_PLATFORMADMIN_PASSWORD'), name: 'Demo Platform Admin', role: 'PLATFORM_ADMIN' },
      { email: 'learner@elab.com', password: pick('SEED_DEMO_LEARNER_PASSWORD'), name: 'Demo Learner', role: 'LEARNER' },
    );
  }

  for (const account of accounts) {
    await createIfMissing(account);
  }

  for (const account of demo) {
    await createIfMissing(account, resetDemo);
  }

  if (accounts.length === 0 && demo.length === 0) {
    console.log('No accounts to seed. Set SEED_SUPERADMIN_EMAIL or SEED_DEMO=true to create them.');
  }

  await seedTechnologies();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());