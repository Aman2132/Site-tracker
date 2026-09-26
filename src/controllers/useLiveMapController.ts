import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DEFAULT_COORDS, HAS_GOOGLE_MAPS_KEY, LIVE_MAP } from '@/constants/config';
import { useCrewTrackingController } from '@/controllers/useCrewTrackingController';
import { useMapMotionController } from '@/controllers/useMapMotionController';
import { getCurrentPosition } from '@/services/locationService';
import { requestForegroundLocationPermission } from '@/services/permissionsService';
import { Person } from '@/types/domain';
import { MAP_STYLES, MapCameraCommand, MapCameraPosition, MapStyle } from '@/types/map';
import { bearingDegrees, crewCenter } from '@/utils/geo';

/**
 * Owner live map: crew positions and trails, plus all camera behaviour —
 * 3D vs flat view, base map style, following a selected crew member, and
 * "motion mode", where the phone's compass and tilt steer the camera.
 */
export function useLiveMapController() {
  const crew = useCrewTrackingController();
  const { trails, loaded } = crew;
  // Deactivated people aren't tracked any more, so they don't belong on the map.
  const people = useMemo(() => crew.people.filter(person => person.active !== false), [crew.people]);

  // Flat by default: with no site to zoom in on, an overview of the crew is the useful first view.
  const [is3d, setIs3d] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>('standard');
  const [motionMode, setMotionMode] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [camera, setCamera] = useState<MapCameraCommand | null>(null);
  const commandId = useRef(0);

  const motion = useMapMotionController(motionMode);

  const moveCamera = useCallback((move: Omit<MapCameraCommand, 'id'>) => {
    commandId.current += 1;
    setCamera({ ...move, id: commandId.current });
  }, []);

  // The selected person is looked up live, so the detail sheet and the camera
  // follow them as new positions stream in.
  const selectedPerson = people.find(person => person.id === selectedPersonId) ?? null;

  /**
   * Where the camera starts: over the crew as they were when the roster
   * first loaded. Frozen after that, so the map doesn't jump every time
   * someone moves — the Crew button re-centres on demand.
   */
  const initialCameraRef = useRef<MapCameraPosition | null>(null);
  if (loaded && !initialCameraRef.current) {
    initialCameraRef.current = {
      center: crewCenter(people, DEFAULT_COORDS),
      zoom: LIVE_MAP.zoomOverview,
      pitch: 0,
      heading: 0,
    };
  }
  const initialCamera = initialCameraRef.current;

  /** Back to an overview of everyone, wherever they are now. */
  const recenter = useCallback(() => {
    moveCamera({
      center: crewCenter(people, DEFAULT_COORDS),
      zoom: LIVE_MAP.zoomOverview,
      pitch: is3d ? LIVE_MAP.pitch3d : 0,
      heading: motionMode ? undefined : 0,
      durationMs: LIVE_MAP.cameraAnimationMs,
    });
  }, [people, is3d, motionMode, moveCamera]);

  // "My location": ask for location only when it's first needed, then fly to this phone.
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), LIVE_MAP.noticeMs);
    return () => clearTimeout(timer);
  }, [notice]);

  const goToMyLocation = useCallback(async () => {
    if (locating) return;
    setLocating(true);
    try {
      if (!(await requestForegroundLocationPermission())) {
        setNotice('Allow location access to see where you are.');
        return;
      }
      const here = await getCurrentPosition();
      if (!here) {
        setNotice("Couldn't find your location. Check that Location is on.");
        return;
      }
      setSelectedPersonId(null); // stop following a crew member, or the camera would fly straight back
      moveCamera({
        center: { lat: here.lat, lng: here.lng },
        zoom: LIVE_MAP.zoomMyLocation,
        durationMs: LIVE_MAP.cameraAnimationMs,
      });
    } finally {
      setLocating(false);
    }
  }, [locating, moveCamera]);

  const toggle3d = useCallback(() => {
    const next = !is3d;
    setIs3d(next);
    moveCamera({
      zoom: next ? LIVE_MAP.zoom3d : LIVE_MAP.zoomOverview,
      pitch: next ? LIVE_MAP.pitch3d : 0,
      heading: next || motionMode ? undefined : 0,
      durationMs: LIVE_MAP.cameraAnimationMs,
    });
  }, [is3d, motionMode, moveCamera]);

  const cycleMapStyle = useCallback(() => {
    setMapStyle(current => MAP_STYLES[(MAP_STYLES.indexOf(current) + 1) % MAP_STYLES.length]);
  }, []);

  const toggleMotionMode = useCallback(() => {
    if (motionMode) {
      // Leaving motion mode: settle back to a tidy, north-up view.
      moveCamera({ heading: 0, pitch: is3d ? LIVE_MAP.pitch3d : 0, durationMs: LIVE_MAP.cameraAnimationMs });
    }
    setMotionMode(!motionMode);
  }, [motionMode, is3d, moveCamera]);

  const selectPerson = useCallback((person: Person) => setSelectedPersonId(person.id), []);

  const clearSelection = useCallback(() => setSelectedPersonId(null), []);

  // Motion mode: stream compass/tilt into the camera. Short animations make
  // each small step glide instead of snap.
  useEffect(() => {
    if (!motionMode || (motion.heading == null && motion.pitch == null)) return;
    moveCamera({
      heading: motion.heading ?? undefined,
      pitch: is3d ? (motion.pitch ?? undefined) : undefined,
      durationMs: LIVE_MAP.sensorIntervalMs * 2,
    });
  }, [motionMode, motion.heading, motion.pitch, is3d, moveCamera]);

  // Fly to a newly selected person, then keep following them as they move.
  const followLat = selectedPerson?.lat;
  const followLng = selectedPerson?.lng;
  const followedId = useRef<string | null>(null);
  useEffect(() => {
    if (followLat == null || followLng == null) {
      followedId.current = null;
      return;
    }
    const justSelected = followedId.current !== selectedPersonId;
    followedId.current = selectedPersonId;
    moveCamera({
      center: { lat: followLat, lng: followLng },
      zoom: justSelected ? LIVE_MAP.zoom3d : undefined,
      durationMs: justSelected ? LIVE_MAP.cameraAnimationMs : LIVE_MAP.markerGlideMs,
    });
  }, [selectedPersonId, followLat, followLng, moveCamera]);

  // Direction of travel for everyone who is moving: the bearing of their last trail step.
  const headings = useMemo(() => {
    const result: Record<string, number | null> = {};
    for (const person of people) {
      const trail = trails[person.id] ?? [];
      const moving = person.kind === 'walk' || person.kind === 'vehicle';
      result[person.id] =
        moving && trail.length >= 2 ? bearingDegrees(trail[trail.length - 2], trail[trail.length - 1]) : null;
    }
    return result;
  }, [people, trails]);

  return {
    loaded: loaded && initialCamera !== null,
    people,
    trails,
    headings,
    hasLiveMap: HAS_GOOGLE_MAPS_KEY,
    initialCamera,
    camera,
    is3d,
    toggle3d,
    mapStyle,
    cycleMapStyle,
    motionMode,
    toggleMotionMode,
    heading: motion.heading,
    recenter,
    goToMyLocation,
    locating,
    notice,
    selectedPerson,
    selectPerson,
    clearSelection,
  };
}
