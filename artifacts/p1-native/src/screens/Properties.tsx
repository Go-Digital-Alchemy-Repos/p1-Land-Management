import React, { useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  Image,
  Modal,
  ScrollView,
} from "react-native";
import type { DashboardProperty } from "../../../../lib/api-client-react/src/dashboard/models/dashboardProperty";
import type { PropertyTimelineEvent } from "../../../../lib/api-client-react/src/dashboard/models/propertyTimelineEvent";
import type { PropertyFile } from "../../../../lib/api-client-react/src/dashboard/models/propertyFile";
import type { BusinessTransport } from "../core/transport";
import {
  formatPropertyTimestamp,
  isPreviewableImage,
  presentPropertyUpdate,
} from "./property-presentation";
export function Properties({
  transport,
  busy,
  run,
}: {
  transport: BusinessTransport;
  busy: boolean;
  run: (action: () => Promise<void>) => Promise<void>;
}) {
  const [image, setImage] = useState<{ uri: string; name: string } | null>(
    null,
  );
  const [properties, setProperties] = useState<DashboardProperty[]>([]),
    [selected, setSelected] = useState<DashboardProperty | null>(null),
    [timeline, setTimeline] = useState<PropertyTimelineEvent[]>([]),
    [files, setFiles] = useState<PropertyFile[]>([]),
    [loadingProperties, setLoadingProperties] = useState(false),
    [loadingDetails, setLoadingDetails] = useState(false),
    [loadingImage, setLoadingImage] = useState<string | null>(null),
    [loadError, setLoadError] = useState("");
  async function open(property: DashboardProperty) {
    setImage(null);
    setSelected(property);
    setTimeline([]);
    setFiles([]);
    setLoadError("");
    setLoadingDetails(true);
    try {
      const [events, media] = await Promise.all([
        transport.request<PropertyTimelineEvent[]>(
          `/api/v1/properties/${property.id}/timeline`,
        ),
        transport.request<PropertyFile[]>(
          `/api/v1/properties/${property.id}/files`,
        ),
      ]);
      setTimeline(events);
      setFiles(media);
    } catch (error) {
      setLoadError("Updates could not be loaded. Try again when connected.");
      throw error;
    } finally {
      setLoadingDetails(false);
    }
  }
  async function previewImage(file: PropertyFile) {
    setLoadError("");
    setLoadingImage(file.id);
    try {
      const result = await transport.request<{
        mime: string;
        bytes: Uint8Array;
      }>(`/api/v1/files/${file.id}/content`, {}, "image");
      let binary = "";
      for (let offset = 0; offset < result.bytes.length; offset += 8192)
        binary += String.fromCharCode(
          ...result.bytes.subarray(offset, offset + 8192),
        );
      setImage({
        uri: `data:${result.mime};base64,${btoa(binary)}`,
        name: file.name,
      });
    } catch (error) {
      setLoadError("This image could not be opened. Try again when connected.");
      throw error;
    } finally {
      setLoadingImage(null);
    }
  }
  return (
    <View style={s.group}>
      <Text accessibilityRole="header" style={s.heading}>
        Properties and available updates
      </Text>
      <Text>
        Online view. Property grants and publication rules are checked by P1 for
        every request.
      </Text>
      <Button
        title="Load authorized properties"
        disabled={busy}
        onPress={() =>
          void run(async () => {
            setLoadError("");
            setLoadingProperties(true);
            setImage(null);
            setSelected(null);
            setTimeline([]);
            setFiles([]);
            try {
              setProperties(
                await transport.request<DashboardProperty[]>(
                  "/api/v1/properties",
                ),
              );
            } catch (error) {
              setLoadError(
                "Properties could not be loaded. Try again when connected.",
              );
              throw error;
            } finally {
              setLoadingProperties(false);
            }
          })
        }
      />
      {loadError ? <Text accessibilityRole="alert">{loadError}</Text> : null}
      {selected ? (
        <View style={s.group}>
          <Text accessibilityRole="header" style={s.heading}>
            {selected.name}
          </Text>
          <Text>{selected.address}</Text>
          <Text>
            {selected.acreage === null
              ? "Acreage not recorded"
              : `${selected.acreage} acres`}
          </Text>
          <Button
            title="Back to properties"
            onPress={() => {
              setSelected(null);
              setTimeline([]);
              setFiles([]);
              setImage(null);
              setLoadError("");
            }}
            disabled={busy}
          />
          {loadingDetails ? (
            <Text accessibilityLiveRegion="polite">
              Loading available updates…
            </Text>
          ) : (
            <>
              <Text accessibilityRole="header" style={s.heading}>
                Latest updates
              </Text>
              {timeline.map((event) => {
                const update = presentPropertyUpdate(event);
                return (
                  <View key={event.id} style={s.card}>
                    <Text style={s.updateTitle}>{update.title}</Text>
                    <Text>{update.kind}</Text>
                    <Text>{formatPropertyTimestamp(update.capturedAt)}</Text>
                    {update.note ? <Text>{update.note}</Text> : null}
                    {update.conflict ? (
                      <Text style={s.warning}>
                        This update has a pending office review.
                      </Text>
                    ) : null}
                  </View>
                );
              })}
              {!timeline.length && <Text>No available updates.</Text>}
              <Text>The API returns up to 200 recent updates.</Text>
              <Text accessibilityRole="header" style={s.heading}>
                Available files
              </Text>
              {files.map((file) => (
                <View key={file.id} style={s.card}>
                  <Text style={s.updateTitle}>{file.name}</Text>
                  <Text>
                    {file.classification} · {formatPropertyTimestamp(file.created_at)}
                  </Text>
                  {isPreviewableImage(file.mime) ? (
                    <Button
                      title={
                        loadingImage === file.id
                          ? `Opening image ${file.name}`
                          : `View image ${file.name}`
                      }
                      disabled={busy || loadingImage !== null}
                      onPress={() =>
                        void run(async () => {
                          setImage(null);
                          await previewImage(file);
                        })
                      }
                    />
                  ) : (
                    <Text>
                      This file type is available from the P1 web dashboard.
                    </Text>
                  )}
                </View>
              ))}
              {!files.length && <Text>No available files.</Text>}
            </>
          )}
        </View>
      ) : (
        <>
          {loadingProperties ? (
            <Text accessibilityLiveRegion="polite">Loading properties…</Text>
          ) : null}
          {properties.map((property) => (
            <View key={property.id} style={s.card}>
              <Text style={s.heading}>{property.name}</Text>
              <Text>{property.address}</Text>
              <Button
                title={`View ${property.name}`}
                disabled={busy}
                onPress={() => void run(() => open(property))}
              />
            </View>
          ))}
          {!loadingProperties && properties.length === 0 ? (
            <Text>No authorized properties are available.</Text>
          ) : null}
        </>
      )}
      <Modal
        visible={Boolean(image)}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setImage(null)}
      >
        {image ? (
          <View style={s.modal} accessibilityViewIsModal>
            <Text accessibilityRole="header" style={s.heading}>
              {image.name}
            </Text>
            <Text>
              Use the full-screen view to inspect this authorized image.
            </Text>
            <ScrollView contentContainerStyle={s.imageViewport}>
              <Image
                accessible
                accessibilityLabel={`Full-screen image: ${image.name}`}
                source={{ uri: image.uri }}
                style={s.image}
                resizeMode="contain"
                onError={() => {
                  setImage(null);
                  setLoadError("This image could not be displayed.");
                }}
              />
            </ScrollView>
            <Button title="Close image" onPress={() => setImage(null)} />
          </View>
        ) : null}
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  group: { gap: 12 },
  heading: { fontSize: 20, fontWeight: "600" },
  card: {
    padding: 14,
    backgroundColor: "white",
    borderColor: "#ced9d1",
    borderWidth: 1,
  },
  updateTitle: { fontSize: 16, fontWeight: "600" },
  warning: { color: "#7a3e00", fontWeight: "600" },
  modal: {
    flex: 1,
    padding: 20,
    gap: 12,
    backgroundColor: "#f5f7f6",
  },
  imageViewport: { flexGrow: 1, justifyContent: "center" },
  image: { width: "100%", height: 520 },
});
