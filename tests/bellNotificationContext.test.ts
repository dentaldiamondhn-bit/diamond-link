import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(
  new URL('../contexts/BellNotificationContext.tsx', import.meta.url),
  'utf8'
);

describe('BellNotificationContext memoization', () => {
  test('imports useMemo alongside useCallback', () => {
    assert.match(source, /import\s*\{[^}]*\buseMemo\b[^}]*\}\s*from\s*'react'/);
    assert.match(source, /import\s*\{[^}]*\buseCallback\b[^}]*\}\s*from\s*'react'/);
  });

  test('memoizes the unread count', () => {
    assert.match(source, /const unreadCount = useMemo\(/);
  });

  test('memoizes the provider value object', () => {
    assert.match(source, /const contextValue = useMemo\(/);
    assert.match(source, /value=\{contextValue\}/);
  });

  test('notification actions are stable callbacks', () => {
    for (const fn of ['addNotification', 'markAsRead', 'markAllAsRead', 'removeNotification', 'clearAll']) {
      assert.match(source, new RegExp(`const ${fn} = useCallback\\(`), `${fn} must be a useCallback`);
    }
  });
});
