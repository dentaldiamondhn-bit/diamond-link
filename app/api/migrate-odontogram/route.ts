import { NextResponse } from 'next/server';
import { OdontogramMigrationService } from '@/services/odontogramMigrationService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, pacienteId, limit } = body;

    switch (action) {
      case 'stats':
        // Get migration statistics
        const stats = await OdontogramMigrationService.getMigrationStats();
        return NextResponse.json(stats);

      case 'single':
        // Migrate single patient
        if (!pacienteId) {
          return NextResponse.json({ error: 'pacienteId is required for single migration' }, { status: 400 });
        }
        const singleResults = await OdontogramMigrationService.migratePatientOdontograms(pacienteId);
        return NextResponse.json({ results: singleResults });

      case 'batch':
        // Migrate batch of patients
        const batchLimit = limit || 10;
        const batchResult = await OdontogramMigrationService.migrateBatchOdontograms(batchLimit);
        return NextResponse.json(batchResult);

      case 'compare':
        // Compare tables to identify missing migrations
        const comparison = await OdontogramMigrationService.compareTables();
        return NextResponse.json(comparison);

      default:
        return NextResponse.json({ error: 'Invalid action. Use: stats, single, batch, or compare' }, { status: 400 });
    }
  } catch (error) {
    console.error('Migration API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Migration failed' },
      { status: 500 }
    );
  }
}
