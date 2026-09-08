import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFrom, mockRpc, mockSupabase } = vi.hoisted(() => {
  const rpc = vi.fn();
  const from = vi.fn();

  return {
    mockFrom: from,
    mockRpc: rpc,
    mockSupabase: { from, rpc },
  };
});

vi.mock('@/services/Dependencies', () => ({
  supabaseClient: mockSupabase,
}));

import { LessonForumRepository } from '../../repositories/LessonForumRepository';
import { NotificationRepository } from '../../repositories/NotificationRepository';
import { SupabaseSystemRepository } from '../../repositories/SupabaseSystemRepository';

const expandMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260830204010_prepare_notifications_secure_writers.sql'
);
const contractMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260830210930_close_notifications_direct_insert_contract.sql'
);
const historicalMigrationPath = resolve(
  process.cwd(),
  'archive/supabase-migrations/20260322120000_add_notifications.sql'
);

describe('SEC-NOTIF — hardening dos writers de notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('SEC-NOTIF-01/02/03/06/07 usa RPC de instrutor sem sender_id confiável', async () => {
    mockRpc.mockResolvedValue({ data: 2, error: null });
    const repository = new NotificationRepository();

    const result = await repository.sendNotificationToUsers(
      ['student-a', 'student-b'],
      'Aviso',
      'Mensagem',
      'forged-instructor-id'
    );

    expect(result).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('send_instructor_notifications', {
      p_recipient_ids: ['student-a', 'student-b'],
      p_title: 'Aviso',
      p_message: 'Mensagem',
    });
    expect(mockRpc.mock.calls[0][1]).not.toHaveProperty('sender_id');
  });

  it('SEC-NOTIF-04/05/14 encaminha resposta do fórum para RPC derivador', async () => {
    const newMessage = {
      id: 'reply-id',
      lesson_id: 'lesson-id',
      user_id: 'student-a',
      content: 'Resposta',
      profiles: { name: 'Aluno', role: 'STUDENT' },
    };
    const single = vi.fn().mockResolvedValue({ data: newMessage, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    mockFrom.mockReturnValue({ insert });
    mockRpc.mockResolvedValue({ data: null, error: null });

    const repository = new LessonForumRepository();
    const result = await repository.createMessage(
      'lesson-id',
      'student-a',
      'Resposta',
      'parent-id'
    );

    expect(result).toEqual(newMessage);
    expect(mockRpc).toHaveBeenCalledWith('notify_forum_reply', {
      p_reply_id: 'reply-id',
    });
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith('lesson_forum_messages');
  });

  it('SEC-NOTIF-08/03 encaminha envio Master sem confiar no sender_id recebido', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const repository = new SupabaseSystemRepository({ rpc } as never);

    await repository.sendNotification(
      'target-user',
      'forged-sender',
      'Mensagem administrativa',
      'Conteúdo',
      'direct_message',
      '/admin'
    );

    expect(rpc).toHaveBeenCalledWith('send_master_notification', {
      p_target_user_id: 'target-user',
      p_title: 'Mensagem administrativa',
      p_message: 'Conteúdo',
      p_type: 'direct_message',
      p_link: '/admin',
    });
    expect(rpc.mock.calls[0][1]).not.toHaveProperty('sender_id');
  });

  it('SEC-NOTIF-09/10/11/12/13 mantém os guardrails no texto da migration nova', () => {
    const migration = readFileSync(expandMigrationPath, 'utf8');

    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.notify_forum_reply');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.send_instructor_notifications');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.send_master_notification');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.notify_forum_reply(uuid)');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.send_instructor_notifications(uuid[], text, text)');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.send_master_notification(uuid, text, text, text, text)');
    expect(migration).toContain('TO authenticated');
    expect(migration).toContain('auth.uid()');
    expect(migration).toContain('SET search_path = pg_catalog, public, pg_temp');
    expect(migration).not.toContain(
      'REVOKE INSERT ON TABLE public.notifications FROM PUBLIC, anon, authenticated;'
    );
    expect(migration).not.toContain('DROP POLICY IF EXISTS notifications_insert_system');
    expect(migration).not.toContain('ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;');
    expect(migration).not.toContain('CREATE POLICY notifications_select_self');
    expect(migration).not.toContain('CREATE POLICY notifications_update_self');
    expect(migration).not.toContain('CREATE POLICY notifications_delete_self');
    expect(migration).not.toMatch(/CREATE POLICY[\s\S]*FOR INSERT[\s\S]*WITH CHECK\s*\(\s*true\s*\)/i);
  });

  it('SEC-NOTIF-CONTRACT fecha o INSERT direto sem alterar RPCs ou self policies', () => {
    const contract = readFileSync(contractMigrationPath, 'utf8');
    const historical = readFileSync(historicalMigrationPath, 'utf8');

    expect(contract).toContain('REVOKE INSERT ON TABLE public.notifications');
    expect(contract).toContain('FROM PUBLIC, anon, authenticated;');
    expect(contract).toContain('DROP POLICY IF EXISTS notifications_insert_system');
    expect(contract).not.toMatch(/CREATE\s+POLICY[\s\S]*FOR\s+INSERT/i);
    expect(contract).not.toContain('notifications_select_self');
    expect(contract).not.toContain('notifications_update_self');
    expect(contract).not.toContain('notifications_delete_self');
    expect(contract).not.toMatch(/CREATE(?:\s+OR\s+REPLACE)?\s+FUNCTION/i);
    expect(contract).not.toMatch(/GRANT\s+EXECUTE/i);
    expect(contract).not.toMatch(
      /notify_forum_reply|send_instructor_notifications|send_master_notification/
    );

    expect(historical).toContain('CREATE POLICY notifications_select_self');
    expect(historical).toContain('CREATE POLICY notifications_update_self');
    expect(historical).toContain('CREATE POLICY notifications_delete_self');
    expect(historical).toContain('CREATE POLICY notifications_insert_system');
    expect(historical).not.toContain('REVOKE INSERT ON TABLE public.notifications');
  });
});
