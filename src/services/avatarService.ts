import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { PROFILE } from '@/constants/config';

/**
 * Lets the person pick a photo from their gallery, crop it square, and
 * returns it shrunk to a small JPEG data URI (see PROFILE.avatarSizePx) —
 * small enough to store inline on their profile. Null if they cancel.
 *
 * Uses the system photo picker, which needs no gallery permission on
 * Android 13+.
 */
export async function pickAvatarImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const context = ImageManipulator.manipulate(result.assets[0].uri);
  context.resize({ width: PROFILE.avatarSizePx, height: PROFILE.avatarSizePx });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: PROFILE.avatarJpegQuality,
    base64: true,
  });
  return saved.base64 ? `data:image/jpeg;base64,${saved.base64}` : null;
}
