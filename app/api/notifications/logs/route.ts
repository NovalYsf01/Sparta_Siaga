import { NextResponse } from 'next/server';
import { getRecentNotificationLogs, generateEmergencyEmailHtml } from '@/lib/notification-service';
import { getSessionUser } from '@/lib/auth';
import { checkUserPermission } from '@/lib/permission-service';
import { UserContext } from '@/lib/report-permissions';
import { NotificationLog } from '@/types/notification';
import {
  NotificationScopeError,
  resolveNotificationReadScope,
} from '@/lib/notification-access';

export const dynamic = 'force-dynamic';

interface NotificationLogsHandlerDependencies {
  getSessionUser: () => Promise<UserContext | null>;
  checkNotificationPermission: (
    user: UserContext
  ) => Promise<{ authorized: boolean; reason?: string }>;
  getNotificationLogs: (limit: number, branch?: string) => Promise<NotificationLog[]>;
}

const defaultDependencies: NotificationLogsHandlerDependencies = {
  getSessionUser,
  checkNotificationPermission: (user) =>
    checkUserPermission({ user, permission: 'NOTIFICATION_VIEW' }),
  getNotificationLogs: getRecentNotificationLogs,
};

function parseLimit(rawLimit: string | null): number {
  const parsed = Number.parseInt(rawLimit || '50', 10);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(1, Math.min(100, parsed));
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Failed to fetch notification logs';
}

export function createNotificationLogsHandler(
  dependencies: NotificationLogsHandlerDependencies
) {
  return async function notificationLogsHandler(request: Request) {
  try {
    const sessionUser = await dependencies.getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const permission = await dependencies.checkNotificationPermission(sessionUser);
    if (!permission.authorized) {
      return NextResponse.json(
        { success: false, error: permission.reason || 'Forbidden' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams.get('limit'));
    const requestedBranch = searchParams.get('branch');
    const scope = resolveNotificationReadScope(sessionUser, requestedBranch);

    const logs = await dependencies.getNotificationLogs(limit, scope.branch);

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
  } catch (error: unknown) {
    if (error instanceof NotificationScopeError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    console.error('[Notification Logs API Error]:', error);
    return NextResponse.json({
      success: false,
      error: getErrorMessage(error)
    }, { status: 500 });
  }
  };
}

export const GET = createNotificationLogsHandler(defaultDependencies);
