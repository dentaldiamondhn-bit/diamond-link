import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SIDEBAR_COLLAPSED,
  readSavedSidebarCollapsed,
  resolveNextSidebarCollapsed,
  resolveSidebarCollapsed,
  shouldApplySavedSidebarCollapsed,
  shouldPersistSidebarCollapsed,
} from '../src/lib/shell/sidebarCollapse.ts';

describe('sidebar collapse defaults', () => {
  test('defaults to the collapsed icon rail', () => {
    assert.equal(DEFAULT_SIDEBAR_COLLAPSED, true);
  });
});

describe('shouldPersistSidebarCollapsed', () => {
  test('persists a deliberate toggle on a regular page', () => {
    assert.equal(shouldPersistSidebarCollapsed(false, true), true);
  });

  test('never persists a contacts toggle', () => {
    assert.equal(shouldPersistSidebarCollapsed(true, true), false);
  });

  test('never persists before the user is authenticated', () => {
    assert.equal(shouldPersistSidebarCollapsed(false, false), false);
    assert.equal(shouldPersistSidebarCollapsed(true, false), false);
  });
});

describe('shouldApplySavedSidebarCollapsed', () => {
  test('applies the saved preference once the preferences have loaded', () => {
    assert.equal(shouldApplySavedSidebarCollapsed(false, false), true);
  });

  test('waits while the preferences are still loading', () => {
    assert.equal(shouldApplySavedSidebarCollapsed(true, false), false);
  });

  test('never overwrites a choice the user already made', () => {
    assert.equal(shouldApplySavedSidebarCollapsed(false, true), false);
    assert.equal(shouldApplySavedSidebarCollapsed(true, true), false);
  });
});

describe('resolveSidebarCollapsed', () => {
  test('follows the saved preference on regular pages', () => {
    assert.equal(
      resolveSidebarCollapsed({
        isContactsPage: false,
        preferredCollapsed: true,
        contactsOverride: null,
      }),
      true,
    );
    assert.equal(
      resolveSidebarCollapsed({
        isContactsPage: false,
        preferredCollapsed: false,
        contactsOverride: null,
      }),
      false,
    );
  });

  test('forces the collapsed rail on the contacts page', () => {
    assert.equal(
      resolveSidebarCollapsed({
        isContactsPage: true,
        preferredCollapsed: false,
        contactsOverride: null,
      }),
      true,
    );
  });

  test('honours a manual toggle made while on the contacts page', () => {
    assert.equal(
      resolveSidebarCollapsed({
        isContactsPage: true,
        preferredCollapsed: false,
        contactsOverride: false,
      }),
      false,
    );
    assert.equal(
      resolveSidebarCollapsed({
        isContactsPage: true,
        preferredCollapsed: true,
        contactsOverride: true,
      }),
      true,
    );
  });
});

describe('resolveNextSidebarCollapsed', () => {
  test('flips the saved preference on regular pages', () => {
    assert.deepEqual(
      resolveNextSidebarCollapsed({
        isContactsPage: false,
        preferredCollapsed: true,
        contactsOverride: null,
      }),
      { preferredCollapsed: false, contactsOverride: null },
    );
    assert.deepEqual(
      resolveNextSidebarCollapsed({
        isContactsPage: false,
        preferredCollapsed: false,
        contactsOverride: null,
      }),
      { preferredCollapsed: true, contactsOverride: null },
    );
  });

  test('flips from the effective state on the contacts page', () => {
    assert.deepEqual(
      resolveNextSidebarCollapsed({
        isContactsPage: true,
        preferredCollapsed: false,
        contactsOverride: null,
      }),
      { preferredCollapsed: false, contactsOverride: false },
    );
    assert.deepEqual(
      resolveNextSidebarCollapsed({
        isContactsPage: true,
        preferredCollapsed: false,
        contactsOverride: false,
      }),
      { preferredCollapsed: false, contactsOverride: true },
    );
  });

  test('leaves the saved preference untouched when toggling on the contacts page', () => {
    assert.deepEqual(
      resolveNextSidebarCollapsed({
        isContactsPage: true,
        preferredCollapsed: true,
        contactsOverride: null,
      }),
      { preferredCollapsed: true, contactsOverride: false },
    );
    assert.deepEqual(
      resolveNextSidebarCollapsed({
        isContactsPage: true,
        preferredCollapsed: true,
        contactsOverride: true,
      }),
      { preferredCollapsed: true, contactsOverride: false },
    );
  });
});

describe('readSavedSidebarCollapsed', () => {
  test('reads the saved value from the global preferences', () => {
    assert.equal(readSavedSidebarCollapsed({ sidebarCollapsed: true }), true);
    assert.equal(readSavedSidebarCollapsed({ sidebarCollapsed: false }), false);
  });

  test('returns null when nothing usable is saved', () => {
    assert.equal(readSavedSidebarCollapsed(undefined), null);
    assert.equal(readSavedSidebarCollapsed(null), null);
    assert.equal(readSavedSidebarCollapsed({}), null);
    assert.equal(readSavedSidebarCollapsed({ sidebarCollapsed: null }), null);
    assert.equal(readSavedSidebarCollapsed({ sidebarCollapsed: 'yes' }), null);
    assert.equal(readSavedSidebarCollapsed('sidebarCollapsed'), null);
  });
});
