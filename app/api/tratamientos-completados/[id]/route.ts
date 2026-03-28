import { NextRequest, NextResponse } from 'next/server';
import { CompletedTreatmentService } from '@/services/completedTreatmentService';
import { supabase } from '@/lib/supabase';


// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const treatment = await CompletedTreatmentService.getCompletedTreatmentById(params.id);
    
    if (!treatment) {
      return NextResponse.json(
        { error: 'Completed treatment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(treatment);
  } catch (error) {
    console.error('Error in GET /api/tratamientos-completados/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch completed treatment' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    // Validate tipo_descuento if provided
    if (body.tipo_descuento && !['monto', 'porcentaje', 'ninguno'].includes(body.tipo_descuento)) {
      return NextResponse.json(
        { error: 'Invalid tipo_descuento value' },
        { status: 400 }
      );
    }

    // Validate estado if provided
    if (body.estado && !['pendiente_firma', 'firmado', 'pagado'].includes(body.estado)) {
      return NextResponse.json(
        { error: 'Invalid estado value' },
        { status: 400 }
      );
    }

    const updatedTreatment = await CompletedTreatmentService.updateCompletedTreatment(params.id, body);
    return NextResponse.json(updatedTreatment);
  } catch (error) {
    console.error('Error in PUT /api/tratamientos-completados/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to update completed treatment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tratamientoId = params.id;
    
    if (!tratamientoId) {
      return NextResponse.json(
        { error: 'ID de tratamiento completado es requerido' },
        { status: 400 }
      );
    }

    console.log(`Starting comprehensive delete for completed treatment: ${tratamientoId}`);

    // Step 1: Get the completed treatment details before deletion
    const completedTreatment = await CompletedTreatmentService.getCompletedTreatmentById(tratamientoId);
    
    if (!completedTreatment) {
      return NextResponse.json(
        { error: 'Tratamiento completado no encontrado' },
        { status: 404 }
      );
    }

    console.log(`Found completed treatment with ${completedTreatment.tratamientos_realizados?.length || 0} items`);

    // Step 2: Delete all treatment items inside the completed treatment
    if (completedTreatment.tratamientos_realizados && completedTreatment.tratamientos_realizados.length > 0) {
      console.log('Deleting treatment items...');
      
      for (const item of completedTreatment.tratamientos_realizados) {
        try {
          await CompletedTreatmentService.removeTreatmentItem(item.id);
          console.log(`Deleted treatment item: ${item.id}`);
        } catch (itemError) {
          console.error(`Error deleting treatment item ${item.id}:`, itemError);
          // Continue with other items even if one fails
        }
      }
    }

    // Step 3: Decrement veces_realizado count in original treatments
    console.log('Decrementing veces_realizado counts...');
    
    if (completedTreatment.tratamientos_realizados) {
      for (const item of completedTreatment.tratamientos_realizados) {
        if (item.tratamiento_id) {
          try {
            // Get the original treatment to decrement its count
            const { data: originalTreatment, error: fetchError } = await supabase
              .from('tratamientos')
              .select('veces_realizado')
              .eq('id', item.tratamiento_id)
              .single();
            
            if (!fetchError && originalTreatment) {
              const newCount = Math.max(0, (originalTreatment.veces_realizado || 0) - (item.cantidad || 1));
              
              const { error: updateError } = await supabase
                .from('tratamientos')
                .update({ veces_realizado: newCount })
                .eq('id', item.tratamiento_id);
              
              if (updateError) {
                console.error(`Error updating veces_realizado for treatment ${item.tratamiento_id}:`, updateError);
              } else {
                console.log(`Decreased veces_realizado for treatment ${item.tratamiento_id} from ${originalTreatment.veces_realizado} to ${newCount}`);
              }
            } else {
              console.error(`Error fetching original treatment ${item.tratamiento_id}:`, fetchError);
            }
          } catch (countError) {
            console.error(`Error processing veces_realizado for treatment ${item.tratamiento_id}:`, countError);
          }
        }
      }
    }

    // Step 4: Remove related signature files from storage
    console.log('Removing signature files...');
    
    if (completedTreatment.firma_paciente_url) {
      try {
        // Extract file path from URL
        const urlParts = completedTreatment.firma_paciente_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `signatures/${fileName}`;
        
        const { error: storageError } = await supabase.storage
          .from('treatment-signatures')
          .remove([filePath]);
        
        if (storageError) {
          console.error('Error removing signature file:', storageError);
        } else {
          console.log(`Successfully removed signature file: ${filePath}`);
        }
      } catch (signatureError) {
        console.error('Error processing signature removal:', signatureError);
      }
    }

    // Step 5: Delete any related payments
    console.log('Deleting related payments...');
    
    try {
      const { error: paymentsError } = await supabase
        .from('pagos')
        .delete()
        .eq('tratamiento_completado_id', tratamientoId);
      
      if (paymentsError) {
        console.error('Error deleting payments:', paymentsError);
      } else {
        console.log('Successfully deleted related payments');
      }
    } catch (paymentsError) {
      console.error('Error processing payments deletion:', paymentsError);
    }

    // Step 6: Finally delete the completed treatment
    console.log('Deleting the completed treatment...');
    
    await CompletedTreatmentService.deleteCompletedTreatment(tratamientoId);
    
    console.log(`Successfully deleted completed treatment: ${tratamientoId}`);

    return NextResponse.json({
      success: true,
      message: 'Tratamiento completado eliminado exitosamente',
      details: {
        treatmentId: tratamientoId,
        itemsDeleted: completedTreatment.tratamientos_realizados?.length || 0,
        signatureRemoved: !!completedTreatment.firma_paciente_url
      }
    });

  } catch (error) {
    console.error('Error deleting completed treatment:', error);
    return NextResponse.json(
      { 
        error: 'Error al eliminar tratamiento completado',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
