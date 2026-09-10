import 'dotenv/config';
import {
  PrismaClient,
  RiskLevel,
  ScreeningStatus,
  ListSource,
  SanctionedEntity,
} from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { createHmac, randomUUID } from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEMO_ORG_ID = 'demo-org-sanctions-guard';
const DEMO_USER_ID = 'demo-user-sanctions-guard';
const DEMO_USER_EMAIL =
  process.env.DEMO_USER_EMAIL || 'demo@sanctions-guard.local';

const hmacSecret =
  process.env.AUDIT_SECRET || 'audit-integrity-salt-secure-key';

function canonicalStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => canonicalStringify(item)).join(',') + ']';
  }
  const record = obj as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  return (
    '{' +
    sortedKeys
      .map((key) => `${JSON.stringify(key)}:${canonicalStringify(record[key])}`)
      .join(',') +
    '}'
  );
}

function generateAuditHash(payload: object): string {
  return createHmac('sha256', hmacSecret)
    .update(canonicalStringify(payload))
    .digest('hex');
}

const DEMO_ENTITIES = [
  {
    externalId: 'DEMO-ENTITY-1',
    name: 'Viktor A. Bout',
    aliases: ['Viktor Anatoliyevich Bout', 'The Merchant of Death'],
    entityType: 'INDIVIDUAL',
    country: 'RU',
    programs: ['SDGT'],
    reason: 'Sample record: arms trafficking sanctions designation.',
  },
  {
    externalId: 'DEMO-ENTITY-2',
    name: 'Northwind Trading Corp',
    aliases: ['Northwind Trade Corporation'],
    entityType: 'ENTITY',
    country: 'IR',
    programs: ['IRAN'],
    reason: 'Sample record: front company for sanctions evasion.',
  },
  {
    externalId: 'DEMO-ENTITY-3',
    name: 'Mikhail Ivanovich Petrov',
    aliases: ['M. I. Petrov'],
    entityType: 'INDIVIDUAL',
    country: 'RU',
    programs: ['UKRAINE-EO13662'],
    reason: 'Sample record: illustrative sanctions designation.',
  },
] as const;

async function main() {
  console.log('Seeding demo data...');

  const org = await prisma.organization.upsert({
    where: { id: DEMO_ORG_ID },
    update: { name: 'Demo Workspace', isDemo: true },
    create: { id: DEMO_ORG_ID, name: 'Demo Workspace', isDemo: true },
  });

  const demoAiProvider =
    process.env.DEMO_AI_PROVIDER === 'ANTHROPIC' ? 'ANTHROPIC' : 'OPENAI';
  const demoAiApiKey =
    (demoAiProvider === 'ANTHROPIC'
      ? process.env.ANTHROPIC_API_KEY
      : process.env.OPENAI_API_KEY) || null;
  const demoOsintApiKey = process.env.SERPER_API_KEY || null;

  await prisma.organizationSettings.upsert({
    where: { orgId: org.id },
    update: {
      aiProvider: demoAiProvider,
      aiApiKey: demoAiApiKey,
      osintApiKey: demoOsintApiKey,
    },
    create: {
      orgId: org.id,
      aiProvider: demoAiProvider,
      aiApiKey: demoAiApiKey,
      osintApiKey: demoOsintApiKey,
      aiThreshold: 50,
      activeListSources: [
        ListSource.OFAC,
        ListSource.EU,
        ListSource.UN,
        ListSource.UK_HMT,
      ],
    },
  });

  const passwordHash = await bcrypt.hash(randomUUID() + randomUUID(), 12);

  const user = await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {
      email: DEMO_USER_EMAIL,
      isDemo: true,
      isActive: true,
      role: 'ADMIN',
      orgId: org.id,
    },
    create: {
      id: DEMO_USER_ID,
      email: DEMO_USER_EMAIL,
      name: 'Demo Analyst',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      isDemo: true,
      orgId: org.id,
    },
  });

  const entities: SanctionedEntity[] = [];
  for (const e of DEMO_ENTITIES) {
    const entity = await prisma.sanctionedEntity.upsert({
      where: { externalId: e.externalId },
      update: {
        name: e.name,
        aliases: [...e.aliases],
        entityType: e.entityType,
        country: e.country,
        programs: [...e.programs],
        reason: e.reason,
        listSource: ListSource.OTHER,
        isActive: true,
      },
      create: {
        externalId: e.externalId,
        name: e.name,
        aliases: [...e.aliases],
        entityType: e.entityType,
        country: e.country,
        programs: [...e.programs],
        reason: e.reason,
        listSource: ListSource.OTHER,
        isActive: true,
      },
    });
    entities.push(entity);
  }

  const alreadySeeded = await prisma.screeningQuery.count({
    where: { orgId: org.id },
  });

  if (alreadySeeded > 0) {
    console.log('Sample screening history already seeded, skipping.');
    console.log(`Demo org ready: ${org.id}, demo user: ${user.email}`);
    return;
  }

  const sampleQueries = [
    {
      queryName: 'Viktor Bout',
      riskLevel: RiskLevel.CRITICAL,
      entity: entities[0],
      score: 0.97,
      aiExplanation:
        'A near-exact match was found against a sanctioned entity known alias. Recommend immediately blocking the transaction and escalating to compliance/legal. (Sample AI explanation for demo purposes.)',
    },
    {
      queryName: 'Northwind Trading',
      riskLevel: RiskLevel.HIGH,
      entity: entities[1],
      score: 0.88,
      aiExplanation:
        'A strong name match was found against a sanctioned entity. Recommend escalating to compliance review before proceeding. (Sample AI explanation for demo purposes.)',
    },
    {
      queryName: 'Mikhail Petrov',
      riskLevel: RiskLevel.MEDIUM,
      entity: entities[2],
      score: 0.72,
      aiExplanation:
        'A moderate name similarity was detected. Recommend verifying additional identifiers before proceeding. (Sample AI explanation for demo purposes.)',
    },
    {
      queryName: 'John Smith',
      riskLevel: RiskLevel.CLEAR,
      entity: null,
      score: 0,
      aiExplanation: null,
    },
  ];

  for (const q of sampleQueries) {
    const query = await prisma.screeningQuery.create({
      data: {
        queryName: q.queryName,
        status: ScreeningStatus.COMPLETED,
        riskLevel: q.riskLevel,
        matchCount: q.entity ? 1 : 0,
        aiExplanation: q.aiExplanation,
        fuzzyMatch: true,
        userId: user.id,
        orgId: org.id,
        matches: q.entity
          ? {
              create: [
                {
                  matchedEntityId: q.entity.id,
                  matchedName: q.entity.name,
                  similarityScore: q.score,
                  matchedField: 'name',
                  listSource: q.entity.listSource,
                },
              ],
            }
          : undefined,
      },
    });

    const auditId = randomUUID();
    const createdAt = new Date();
    const payload = {
      id: auditId,
      action: 'SCREENING_PERFORMED',
      actorId: user.id,
      orgId: org.id,
      queryId: query.id,
      metadata: {
        queryName: q.queryName,
        riskLevel: q.riskLevel,
        matchCount: q.entity ? 1 : 0,
      },
      createdAt: createdAt.toISOString(),
    };

    await prisma.auditLog.create({
      data: {
        id: auditId,
        action: 'SCREENING_PERFORMED',
        actorId: user.id,
        orgId: org.id,
        queryId: query.id,
        metadata: payload.metadata,
        integrityHash: generateAuditHash(payload),
        createdAt,
      },
    });
  }

  console.log(`Demo org ready: ${org.id}, demo user: ${user.email}`);
}

main()
  .catch((e) => {
    console.error('Demo seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
