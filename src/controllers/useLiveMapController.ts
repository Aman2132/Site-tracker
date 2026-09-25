import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { HAS_GOOGLE_MAPS_KEY, LIVE_MAP } from '@/constants/config';
import { useCrewTrackingController } from '@/controllers/useCrewTrackingController';
import { useMapMotionController } from '@/controllers/useMapMotionController';
import { Person } from '@/types/domain';
import { MAP_STYLES, MapCameraCommand, MapCameraPosition, MapStyle } from '@/types/map';
import { bearingDegrees } from '@/utils/geo';

/**
 * Owner live map: crew positions and trails, plus all camera behaviour —
 * 3D vs flat view, base map style, following a selected crew member, and
 * "motion mode", where the phone's compass and tilt steer the camera.
 */
export function useLiveMapController() {
  const { people, trails, site, loaded } = useCrewTrackingController();

  const [is3d, setIs3d] = useState(true);
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

  /** Where the camera starts, before any command has been issued. */
  const initialCamera: MapCameraPosition | null = site
    ? {
        center: { lat: site.lat, lng: site.lng },
        zoom: LIVE_MAP.zoom3d,
        pitch: LIVE_MAP.pitch3d,
        heading: 0,
      }
    : null;

  const recenter = useCallback(() => {
    if (!site) return;
    moveCamera({
      center: { lat: site.lat, lng: site.lng },
      zoom: is3d ? LIVE_MAP.zoom3d : LIVE_MAP.zoomOverview,
      pitch: is3d ? LIVE_MAP.pitch3d : 0,
      heading: motionMode ? undefined : 0,
      durationMs: LIVE_MAP.cameraAnimationMs,
    });
  }, [site, is3d, motionMode, moveCamera]);

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
    loaded: loaded && site !== null,
    site,
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
    selectedPerson,
    selectPerson,
    clearSelection,
  };
}
