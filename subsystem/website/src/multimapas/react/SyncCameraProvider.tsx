import type { SetViewOptions } from '@ttoss/geovis';
import * as React from 'react';

import {
  SyncCameraContext,
  type SyncCameraContextValue,
} from './SyncCameraContext';

/**
 * Provides a broadcast channel so all GeoVisMapWrapper instances under this
 * provider move their cameras together when any one of them changes view.
 *
 * Design (Option A — imperative broadcast via ref):
 * - A Set of `setView` callbacks is stored in a ref (not state) so that
 *   register/unregister never trigger a re-render of this component.
 * - `broadcast` fans out `SetViewOptions` to every registered callback
 *   except the source, preventing echo loops.
 * - The provider itself has no state — it is pure glue.
 */
export const SyncCameraProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const listenersRef = React.useRef<Set<(options: SetViewOptions) => void>>(
    new Set()
  );

  const value = React.useMemo<SyncCameraContextValue>(() => {
    const register = (setView: (options: SetViewOptions) => void) => {
      listenersRef.current.add(setView);
      return () => {
        listenersRef.current.delete(setView);
      };
    };

    const broadcast = (
      options: SetViewOptions,
      source: (options: SetViewOptions) => void
    ) => {
      for (const fn of listenersRef.current) {
        if (fn !== source) {
          fn(options);
        }
      }
    };

    return { register, broadcast };
  }, []);

  return (
    <SyncCameraContext.Provider value={value}>
      {children}
    </SyncCameraContext.Provider>
  );
};
