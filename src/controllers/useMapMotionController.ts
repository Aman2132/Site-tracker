import { useEffect, useRef, useState } from 'react';

import { LIVE_MAP } from '@/constants/config';
import { watchCompassHeading, watchTilt } from '@/services/motionService';
import { angleDelta, pitchFromTilt, smoothAngle, smoothValue } from '@/utils/motion';

/** Pitch changes smaller than this (degrees) are not worth moving the camera for. */
const PITCH_DEADBAND_DEG = 1;

export interface MapMotion {
  /** Smoothed compass heading, degrees clockwise from north. Null until the first reading. */
  heading: number | null;
  /** Map pitch derived from how the phone is held. Null until the first reading. */
  pitch: number | null;
}

/**
 * While `enabled`, turns the phone's compass and tilt into a smoothed map
 * camera heading/pitch: turn around and the map turns with you; raise the
 * phone to eye level and the map tilts into 3D. Readings arrive ~10 times a
 * second, so they are smoothed and only published when they move past a small
 * deadband — otherwise the map would re-render (and jitter) constantly.
 */
export function useMapMotionController(enabled: boolean): MapMotion {
  const [motion, setMotion] = useState<MapMotion>({ heading: null, pitch: null });
  const smoothed = useRef<{ heading: number | null; pitch: number | null }>({ heading: null, pitch: null });
  const published = useRef<MapMotion>({ heading: null, pitch: null });

  useEffect(() => {
    if (!enabled) return;

    const publishIfMoved = () => {
      const { heading, pitch } = smoothed.current;
      const last = published.current;
      const headingMoved =
        heading != null &&
        (last.heading == null || Math.abs(angleDelta(last.heading, heading)) >= LIVE_MAP.headingDeadbandDeg);
      const pitchMoved =
        pitch != null && (last.pitch == null || Math.abs(pitch - last.pitch) >= PITCH_DEADBAND_DEG);
      if (!headingMoved && !pitchMoved) return;
      published.current = {
        heading: headingMoved ? heading : last.heading,
        pitch: pitchMoved ? pitch : last.pitch,
      };
      setMotion(published.current);
    };

    const stopHeading = watchCompassHeading(degrees => {
      smoothed.current.heading = smoothAngle(smoothed.current.heading, degrees, LIVE_MAP.sensorSmoothing);
      publishIfMoved();
    });
    const stopTilt = watchTilt(beta => {
      const target = pitchFromTilt(beta, LIVE_MAP.minPitch, LIVE_MAP.maxPitch);
      smoothed.current.pitch = smoothValue(smoothed.current.pitch, target, LIVE_MAP.sensorSmoothing);
      publishIfMoved();
    }, LIVE_MAP.sensorIntervalMs);

    return () => {
      stopHeading();
      stopTilt();
      // Start fresh next time, rather than easing in from a stale orientation.
      smoothed.current = { heading: null, pitch: null };
      published.current = { heading: null, pitch: null };
      setMotion({ heading: null, pitch: null });
    };
  }, [enabled]);

  return motion;
}
