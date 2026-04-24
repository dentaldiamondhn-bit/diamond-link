import { NextResponse } from 'next/server';
import { OlearyService } from '../../../services/oLearyService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pacienteId = searchParams.get('pacienteId');
    const odontogramId = searchParams.get('odontogramId');
    const action = searchParams.get('action');

    if (action === 'history' && pacienteId) {
      // Get O'Leary odontogram history for a patient
      const history = await OlearyService.getOdontogramHistory(pacienteId);
      return NextResponse.json(history);
    } else if (action === 'active' && pacienteId) {
      // Get active O'Leary odontogram for a patient
      const activeOdontogram = await OlearyService.getActiveOdontogram(pacienteId);
      return NextResponse.json(activeOdontogram);
    } else if (action === 'stats' && pacienteId) {
      // Get plaque index statistics for a patient
      const stats = await OlearyService.getPlaqueIndexStats(pacienteId);
      return NextResponse.json(stats);
    } else if (odontogramId) {
      // Get specific O'Leary odontogram by ID
      const odontogram = await OlearyService.getOdontogramById(odontogramId);
      if (!odontogram) {
        return NextResponse.json({ error: 'O\'Leary odontogram not found' }, { status: 404 });
      }
      return NextResponse.json(odontogram);
    } else {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
  } catch (error) {
    console.error('O\'Leary API GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch O\'Leary data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, pacienteId, datosOdontograma, notas, creadoPor } = body;

    if (action === 'create' && pacienteId && datosOdontograma) {
      // Create new O'Leary odontogram
      const newOdontogram = await OlearyService.createOdontogram(
        pacienteId,
        datosOdontograma,
        notas,
        creadoPor
      );
      return NextResponse.json(newOdontogram);
    } else if (action === 'new-version' && pacienteId && datosOdontograma) {
      // Create new version of O'Leary odontogram
      const newVersion = await OlearyService.createNewVersion(
        pacienteId,
        datosOdontograma,
        notas,
        creadoPor
      );
      return NextResponse.json(newVersion);
    } else {
      return NextResponse.json({ error: 'Invalid action or missing parameters' }, { status: 400 });
    }
  } catch (error) {
    console.error('O\'Leary API POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create O\'Leary data' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { odontogramId, datosOdontograma, notas } = body;

    if (!odontogramId || !datosOdontograma) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Update existing O'Leary odontogram
    const updatedOdontogram = await OlearyService.updateOdontogram(
      odontogramId,
      datosOdontograma,
      notas
    );
    return NextResponse.json(updatedOdontogram);
  } catch (error) {
    console.error('O\'Leary API PUT error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update O\'Leary data' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const odontogramId = searchParams.get('odontogramId');

    if (!odontogramId) {
      return NextResponse.json({ error: 'Missing odontogram ID' }, { status: 400 });
    }

    // Delete O'Leary odontogram
    await OlearyService.deleteOdontogram(odontogramId);
    return NextResponse.json({ message: 'O\'Leary odontogram deleted successfully' });
  } catch (error) {
    console.error('O\'Leary API DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete O\'Leary data' },
      { status: 500 }
    );
  }
}
