import { NextResponse } from 'next/server';
import { getRecentNotificationLogs } from '@/lib/notification-service';
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

    // Never expose recipient contact, delivery/audit metadata, acknowledgement state,
    // or internal inspection findings in the nationwide informational feed.
    // Viewing operational incident details still requires the incident API's permissions.
    const enrichedLogs = logs.map((log) => ({
      id: log.id,
      disaster_id: log.disaster_id,
      disaster_type: log.disaster_type,
      branch: log.branch,
      title: log.title,
      message: log.message,
      affected_stores_count: log.affected_stores_count,
      affected_stores_sample: log.affected_stores_sample,
      ticket_number: log.ticket_number,
      sent_at: log.sent_at,
    }));

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
