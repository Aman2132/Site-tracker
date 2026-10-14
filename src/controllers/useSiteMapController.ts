import { useSiteCrewController } from './useSiteCrewController';

import { HAS_GOOGLE_MAPS_KEY } from '@/constants/config';
import { useShiftStore } from '@/store/useShiftStore';

/** Map tab: my site-mates' positions at the site I'm checked in at (none while checked out). */
export function useSiteMapController() {
  const active = useShiftStore(state => state.active);
  const siteCrew = useSiteCrewController(active?.siteId);
  return {
    ...siteCrew,
    siteName: active?.siteName,
    checkedIn: !!active,
    paused: !!active?.paused,
    hasMap: HAS_GOOGLE_MAPS_KEY,
  };
}
