import type { SetViewOptions } from '@ttoss/geovis';
import * as React from 'react';

/**
 * Callback type registered by each GeoVisMapInner instance.
 * Called by the context whenever any map broadcasts a camera change.
 */
type SetViewFn = (options: SetViewOptions) => void;

/**
 * Value exposed by SyncCameraContext.
 *
 * - `register`: called on mount to enroll a map's `setView` in the broadcast
 *   list. Returns an `unregister` function to call on unmount.
 * - `broadcast`: called by whichever map initiated the camera change; fans
 *   out `SetViewOptions` to every other registered map.
 */
export interface SyncCameraContextValue {
  register: (setView: SetViewFn) => () => void;
  broadcast: (options: SetViewOptions, source: SetViewFn) => void;
}

export const SyncCameraContext =
  React.createContext<SyncCameraContextValue | null>(null);

/**
 * Returns the SyncCameraContextValue when consumed inside SyncCameraProvider.
 * Returns null outside the provider so GeoVisMapWrapper can be used standalone
 * (e.g. in unit tests or Storybook stories) without requiring the provider.
 */
export const useSyncCamera = (): SyncCameraContextValue | null => {
  return React.useContext(SyncCameraContext);
};
