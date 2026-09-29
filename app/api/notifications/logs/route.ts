import { NextResponse } from 'next/server';
import { getRecentNotificationLogs, generateEmergencyEmailHtml } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const branch = searchParams.get('branch') || undefined;

    const logs = await getRecentNotificationLogs(limit, branch);

    // Attach email preview generator if email_and_pwa channel
    const enrichedLogs = logs.map(log => {
      if (log.channel === 'email_and_pwa') {
        const emailHtml = generateEmergencyEmailHtml({
          ticketNumber: log.ticket_number,
          branch: log.branch,
          disasterTitle: log.title,
          disasterDetail: log.message,
          affectedCount: log.affected_stores_count,
          stores: log.affected_stores_sample || [],
          instructions: [
            'Duty Officer DC Cabang segera melakukan panggilan radio/telepon siaga ke Area Coordinator (AC) terkait.',
            'Instruksikan personil toko melakukan evakuasi pelanggan dan kru jika struktur bangunan menunjukkan keretakan.',
            'Matikan aliran listrik utama (MCB) dan amankan tabung gas jika tercium bau kebocoran.',
            'Laporkan status operasional (Buka / Tutup Sementara / Kerusakan) melalui Command Center SPARTA.'
          ],
          sentAt: new Date(log.sent_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB'
        });
        return {
          ...log,
          email_html_preview: emailHtml
        };
      }
      return log;
    });

    return NextResponse.json({
      success: true,
      count: enrichedLogs.length,
      logs: enrichedLogs
    });
  } catch (error: any) {
    console.error('[Notification Logs API Error]:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch notification logs'
    }, { status: 500 });
  }
}
