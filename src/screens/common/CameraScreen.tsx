import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera } from 'react-native-vision-camera';

import CameraModeSwitch from '@/components/worker/CameraModeSwitch';
import CameraPermissionGate from '@/components/worker/CameraPermissionGate';
import CameraProblemOverlay from '@/components/worker/CameraProblemOverlay';
import CameraShutterButton from '@/components/worker/CameraShutterButton';
import CameraZoomControl from '@/components/worker/CameraZoomControl';
import CaptureToast from '@/components/worker/CaptureToast';
import FocusIndicator from '@/components/worker/FocusIndicator';
import GpsAccuracyBadge from '@/components/worker/GpsAccuracyBadge';
import RecordingBadge from '@/components/worker/RecordingBadge';
import { CAMERA } from '@/constants/config';
import { colors, fontFamily, radius, spacing } from '@/constants/theme';
import { useCameraController } from '@/controllers/useCameraController';

const DEFAULT_TASK_LABEL = 'Column grid L4';

/**
 * Camera tab (workers and owners). Camera permission is settled first; the
 * viewfinder — which then asks for location and gallery access — only mounts
 * once it's granted, so the prompts never overlap.
 */
export default function CameraScreen() {
  const navigation = useNavigation();
  return (
    <CameraPermissionGate onClose={() => navigation.goBack()}>
      <CameraView />
    </CameraPermissionGate>
  );
}

function CameraView() {
  const {
    cameraRef,
    device,
    format,
    isActive,
    mode,
    setMode,
    audioEnabled,
    photoHdr,
    videoHdr,
    lowLightBoost,
    videoStabilizationMode,
    focusPoint,
    zoom,
    zoomStops,
    setZoom,
    attempt,
    problem,
    retry,
    onCameraError,
    onCameraInitialized,
    onShutter,
    pinchHandlers,
    isSaving,
    isRecording,
    recordingMs,
    lastSavedLabel,
    lastSavedIsPrecise,
    clearLastSavedLabel,
    liveAccuracy,
    hasFix,
  } = useCameraController(DEFAULT_TASK_LABEL);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  useEffect(() => {
    if (!lastSavedLabel) return;
    const timer = setTimeout(clearLastSavedLabel, 2000);
    return () => clearTimeout(timer);
  }, [lastSavedLabel, clearLastSavedLabel]);

  return (
    <View style={styles.flex}>
      {device ? (
        <View style={styles.flex} {...pinchHandlers}>
          <Camera
            key={attempt}
            ref={cameraRef}
            style={styles.flex}
            device={device}
            format={format}
            zoom={zoom}
            isActive={isActive}
            photo={mode === 'photo'}
            video={mode === 'video'}
            audio={audioEnabled}
            photoHdr={photoHdr}
            videoHdr={videoHdr}
            lowLightBoost={lowLightBoost}
            videoStabilizationMode={videoStabilizationMode}
            photoQualityBalance="quality"
            onError={onCameraError}
            onInitialized={onCameraInitialized}
          />
          {focusPoint && <FocusIndicator x={focusPoint.x} y={focusPoint.y} pointKey={focusPoint.key} />}
        </View>
      ) : (
        <View style={styles.noDeviceWrap}>
          <Ionicons name="camera-outline" size={40} color={colors.onGlassMuted} />
          <Text style={styles.noDeviceTitle}>No camera detected</Text>
          <Text style={styles.noDeviceText}>
            react-native-vision-camera can't find a usable camera. Android Studio emulators often don't expose
            one it recognizes — try a physical device, or set the AVD's back camera to your computer's webcam
            (Device Manager → edit device → Camera).
          </Text>
        </View>
      )}

      {/* The tab bar is hidden on this screen, so this is the visible way out.
            Disabled mid-recording so a clip can't be abandoned by accident. */}
      <TouchableOpacity
        style={[styles.closeButton, { top: insets.top + spacing.sm }, isRecording && styles.closeDisabled]}
        onPress={() => navigation.goBack()}
        disabled={isRecording}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Close camera"
      >
        <Ionicons name="close" size={22} color={colors.white} />
      </TouchableOpacity>

      <View style={[styles.taskBar, { top: insets.top + spacing.sm }]}>
        <Ionicons name="location" size={13} color={colors.white} />
        <Text style={styles.taskText}>{DEFAULT_TASK_LABEL}</Text>
      </View>

      <View style={[styles.accuracyBar, { top: insets.top + spacing.sm + 40 }]}>
        {isRecording ? (
          <RecordingBadge elapsedMs={recordingMs} maxMs={CAMERA.maxVideoSeconds * 1000} />
        ) : (
          <GpsAccuracyBadge accuracyMeters={liveAccuracy} />
        )}
      </View>

      <View style={styles.controls} pointerEvents="box-none">
        <CameraZoomControl
          stops={zoomStops}
          zoom={zoom}
          neutralZoom={device?.neutralZoom ?? 1}
          onSelect={setZoom}
        />
        <CameraModeSwitch mode={mode} onChange={setMode} disabled={isRecording} />
        <CameraShutterButton
          onPress={onShutter}
          mode={mode}
          recording={isRecording}
          disabled={!device || !isActive || !hasFix || (mode === 'photo' && isSaving)}
        />
      </View>

      <CaptureToast
        message={
          lastSavedLabel ? `Saved · ${lastSavedLabel}${lastSavedIsPrecise ? '' : ' · low accuracy'}` : null
        }
        warn={!lastSavedIsPrecise}
      />

      {problem && <CameraProblemOverlay message={problem.message} onRetry={retry} />}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.black },
  noDeviceWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.sm,
  },
  noDeviceTitle: {
    fontFamily: fontFamily.semibold,
    color: colors.white,
    fontSize: 16,
    marginTop: spacing.xs,
  },
  noDeviceText: {
    fontFamily: fontFamily.regular,
    color: colors.onGlassMuted,
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 18,
  },
  closeButton: {
    position: 'absolute',
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeDisabled: { opacity: 0.35 },
  taskBar: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.glass,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
  },
  taskText: { fontFamily: fontFamily.semibold, color: colors.white, fontSize: 12.5 },
  accuracyBar: { position: 'absolute', alignSelf: 'center' },
  controls: {
    position: 'absolute',
    bottom: 44,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing.lg,
  },
});
