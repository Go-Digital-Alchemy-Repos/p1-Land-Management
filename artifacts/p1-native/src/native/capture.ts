import * as Picker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as Crypto from "expo-crypto";
import { File, Paths } from "expo-file-system";
import type { Vault } from "./vault";
export async function capturePhoto(
  vault: Vault,
  workOrderId: string,
  propertyId: string,
  camera: boolean,
) {
  const permission = camera
    ? await Picker.requestCameraPermissionsAsync()
    : await Picker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      "Photo permission is unavailable. Your other saved work is unchanged.",
    );
  const result = camera
    ? await Picker.launchCameraAsync({
        mediaTypes: ["images"],
        exif: false,
        quality: 0.85,
      })
    : await Picker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        exif: false,
        quality: 0.85,
      });
  if (result.canceled) return false;
  const source = result.assets[0];
  const context = ImageManipulator.manipulate(source.uri);
  if (source.width > 2560 || source.height > 2560)
    context.resize(
      source.width >= source.height ? { width: 2560 } : { height: 2560 },
    );
  const image = await context.renderAsync();
  const normalized = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.85,
  });
  await vault.stagePhoto(
    {
      id: Crypto.randomUUID(),
      workOrderId,
      propertyId,
      mime: "image/jpeg",
      classification: "general",
      capturedAt: new Date().toISOString(),
    },
    normalized.uri,
  );
  // Picker returns an application cache copy, never remove a photo-library asset.
  if (
    source.uri !== normalized.uri &&
    source.uri.startsWith("file:") &&
    source.uri.startsWith(Paths.cache.uri)
  ) {
    const temporary = new File(source.uri);
    if (temporary.exists) temporary.delete();
  }
  return true;
}
