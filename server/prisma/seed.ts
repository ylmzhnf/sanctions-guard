import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { chain } from 'stream-chain';
import parser from 'stream-json';
import StreamArray from 'stream-json/streamers/StreamArray';

const prisma = new PrismaClient();
const BATCH_SIZE = 500; // Optimum veritabanı yazım hızı için

async function main() {
  const filePath = path.join(__dirname, '../data/sample_targets.json');
  console.log('🚀 Starting JSON Stream Parsing...');

  // Pipeline oluştur: Dosyayı oku -> JSON objelerine ayır -> Array elemanlarını teker teker ver
  const pipeline = chain([
    fs.createReadStream(filePath),
    parser(),
    StreamArray.withParser(),
  ]);

  let batch: any[] = [];
  let processedCount = 0;
  let totalSaved = 0;

  // Promise mantığıyla stream'i asenkron yönetiyoruz
  await new Promise((resolve, reject) => {
    pipeline.on('data', async (data) => {
      const entity = data.value;
      processedCount++;

      // Sadece 'target' olanları belleğe al
      if (entity.target) {
        batch.push(entity);
      }

      // Batch boyutu dolduysa stream'i duraklat, DB'ye yaz, sonra devam et
      if (batch.length >= BATCH_SIZE) {
        pipeline.pause(); // OOM (Out of Memory) olmamak için okumayı duraklat
        await processBatch(batch);
        totalSaved += batch.length;
        batch = []; // Belleği boşalt
        pipeline.resume(); // Okumaya devam et
      }
    });

    pipeline.on('end', async () => {
      // Stream bittiğinde kalan son batch'i işle
      if (batch.length > 0) {
        await processBatch(batch);
        totalSaved += batch.length;
      }
      console.log(
        `\n✅ Seeding completed! Scanned: ${processedCount}, Saved Targets: ${totalSaved}`,
      );
      resolve(true);
    });

    pipeline.on('error', (err) => {
      console.error('❌ Pipeline Error:', err);
      reject(err);
    });
  });
}

// Toplu Yazım (Batching) Fonksiyonu
async function processBatch(entities: any[]) {
  const upsertPromises = entities.map((entity) => {
    const fullName =
      entity.caption || entity.properties?.name?.[0] || 'Unknown';
    const country = entity.properties?.country?.[0] || 'Unknown';
    const aliases = entity.properties?.alias?.filter(Boolean) || [];

    const programs = [
      ...(entity.properties?.program || []),
      ...(entity.properties?.sanctions?.flatMap(
        (s: any) => s.properties?.program || [],
      ) || []),
    ].filter(Boolean);

    const notes = entity.properties?.notes?.join('')?.trim();
    const sanctionReason = entity.properties?.sanctions
      ?.map((s: any) => s.properties?.reason?.join(', '))
      .filter(Boolean)
      .join(' | ')
      ?.trim();

    const reason = notes || sanctionReason || 'No reason provided';
    const entityType = entity.schema || 'Unknown';

    return prisma.sanctionedEntity.upsert({
      where: { externalId: entity.id },
      update: {
        name: fullName,
        aliases,
        country,
        programs,
        reason,
        entityType,
      },
      create: {
        externalId: entity.id,
        name: fullName,
        aliases,
        listSource: 'OTHER',
        country,
        programs,
        entityType,
        reason,
      },
    });
  });

  try {
    await prisma.$transaction(upsertPromises);
    process.stdout.write('.');
  } catch (err) {
    console.error('\n❌ DB Transaction Failed for a batch:', err);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
