import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/webhooks/deliver - Deliver webhook event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { event, data } = body;
    
    if (!event || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: event and data are required' },
        { status: 400 }
      );
    }

    // Get active webhooks for this event
    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('event', event)
      .eq('is_active', true);

    if (error) throw error;

    if (!webhooks || webhooks.length === 0) {
      return NextResponse.json({ 
        message: 'No active webhooks for this event',
        delivered: 0
      });
    }

    // Deliver to each webhook
    const results = await Promise.allSettled(
      webhooks.map(async (webhook) => {
        try {
          // Generate signature
          const timestamp = Date.now();
          const payload = JSON.stringify({ event, data, timestamp });
          const signature = crypto
            .createHmac('sha256', webhook.secret)
            .update(payload)
            .digest('hex');

          // Send webhook
          const response = await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': signature,
              'X-Webhook-Timestamp': timestamp.toString(),
              'X-Webhook-Event': event,
            },
            body: payload,
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          // Log successful delivery
          await supabase.from('webhook_logs').insert([{
            webhook_id: webhook.id,
            event,
            status: 'delivered',
            response_status: response.status,
            delivered_at: new Date().toISOString(),
          }]);

          return { webhook_id: webhook.id, status: 'delivered' };
        } catch (error) {
          // Log failed delivery
          await supabase.from('webhook_logs').insert([{
            webhook_id: webhook.id,
            event,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            delivered_at: new Date().toISOString(),
          }]);

          throw error;
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      message: 'Webhook delivery completed',
      total: webhooks.length,
      successful,
      failed,
      results: results.map((r, i) => ({
        webhook_id: webhooks[i].id,
        status: r.status === 'fulfilled' ? 'delivered' : 'failed',
        error: r.status === 'rejected' ? r.reason : null,
      }))
    });
  } catch (error) {
    console.error('Error delivering webhooks:', error);
    return NextResponse.json(
      { error: 'Failed to deliver webhooks' },
      { status: 500 }
    );
  }
}
