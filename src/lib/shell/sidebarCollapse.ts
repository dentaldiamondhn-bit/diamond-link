export const DEFAULT_SIDEBAR_COLLAPSED = true;

export interface SidebarCollapseState {
  isContactsPage: boolean;
  preferredCollapsed: boolean;
  contactsOverride: boolean | null;
}

export interface SidebarCollapseUpdate {
  preferredCollapsed: boolean;
  contactsOverride: boolean | null;
}

export function resolveSidebarCollapsed(state: SidebarCollapseState): boolean {
  const { isContactsPage, preferredCollapsed, contactsOverride } = state;

  if (isContactsPage) {
    return contactsOverride ?? true;
  }

  return preferredCollapsed;
}

export function resolveNextSidebarCollapsed(
  state: SidebarCollapseState,
): SidebarCollapseUpdate {
  const next = !resolveSidebarCollapsed(state);

  if (state.isContactsPage) {
    return {
      preferredCollapsed: state.preferredCollapsed,
      contactsOverride: next,
    };
  }

  return {
    preferredCollapsed: next,
    contactsOverride: null,
  };
}

export function shouldPersistSidebarCollapsed(
  isContactsPage: boolean,
  hasUser: boolean,
): boolean {
  return hasUser && !isContactsPage;
}

export function shouldApplySavedSidebarCollapsed(
  loading: boolean,
  userChoseRail: boolean,
): boolean {
  return !loading && !userChoseRail;
}

export function readSavedSidebarCollapsed(preferences: unknown): boolean | null {
  if (!preferences || typeof preferences !== 'object') {
    return null;
  }

  const saved = (preferences as Record<string, unknown>).sidebarCollapsed;

  return typeof saved === 'boolean' ? saved : null;
}
