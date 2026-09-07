import React, { useState } from "react";
import { View, Text, Button, StyleSheet, Image } from "react-native";
import type { DashboardProperty } from "../../../../lib/api-client-react/src/dashboard/models/dashboardProperty";
import type { PropertyTimelineEvent } from "../../../../lib/api-client-react/src/dashboard/models/propertyTimelineEvent";
import type { PropertyFile } from "../../../../lib/api-client-react/src/dashboard/models/propertyFile";
import type { BusinessTransport } from "../core/transport";
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
    [files, setFiles] = useState<PropertyFile[]>([]);
  async function open(property: DashboardProperty) {
    setImage(null);
    setSelected(null);
    setTimeline([]);
    setFiles([]);
    const [events, media] = await Promise.all([
      transport.request<PropertyTimelineEvent[]>(
        `/api/v1/properties/${property.id}/timeline`,
      ),
      transport.request<PropertyFile[]>(
        `/api/v1/properties/${property.id}/files`,
      ),
    ]);
    setSelected(property);
    setTimeline(events);
    setFiles(media);
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
            setImage(null);
            setSelected(null);
            setTimeline([]);
            setFiles([]);
            setProperties(
              await transport.request<DashboardProperty[]>(
                "/api/v1/properties",
              ),
            );
            setSelected(null);
            setTimeline([]);
            setFiles([]);
            setImage(null);
          })
        }
      />
      {selected ? (
        <View style={s.group}>
          <Text style={s.heading}>{selected.name}</Text>
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
            }}
            disabled={busy}
          />
          <Text style={s.heading}>Latest updates</Text>
          {timeline.map((event) => (
            <View key={event.id} style={s.card}>
              <Text>
                {event.title} · {event.kind}
              </Text>
              <Text>{new Date(event.captured_at).toLocaleString()}</Text>
              {typeof event.payload.text === "string" && (
                <Text>{event.payload.text}</Text>
              )}
            </View>
          ))}
          {!timeline.length && <Text>No available updates.</Text>}
          <Text>The API returns up to 200 recent updates.</Text>
          <Text style={s.heading}>Available files</Text>
          {files.map((file) => (
            <View key={file.id} style={s.card}>
              <Text>{file.name}</Text>
              <Text>
                {file.classification} ·{" "}
                {new Date(file.created_at).toLocaleDateString()}
              </Text>
              <Button
                title={`View image ${file.name}`}
                disabled={busy}
                onPress={() =>
                  void run(async () => {
                    setImage(null);
                    const result = await transport.request<{
                      mime: string;
                      bytes: Uint8Array;
                    }>(`/api/v1/files/${file.id}/content`, {}, "image");
                    let binary = "";
                    for (
                      let offset = 0;
                      offset < result.bytes.length;
                      offset += 8192
                    )
                      binary += String.fromCharCode(
                        ...result.bytes.subarray(offset, offset + 8192),
                      );
                    setImage({
                      uri: `data:${result.mime};base64,${btoa(binary)}`,
                      name: file.name,
                    });
                  })
                }
              />
            </View>
          ))}
          {!files.length && <Text>No available files.</Text>}
          {image && (
            <View>
              <Image
                accessibilityLabel={image.name}
                source={{ uri: image.uri }}
                style={{ width: "100%", height: 320 }}
                resizeMode="contain"
                onError={() => setImage(null)}
              />
              <Button title="Close image" onPress={() => setImage(null)} />
            </View>
          )}
        </View>
      ) : (
        properties.map((property) => (
          <View key={property.id} style={s.card}>
            <Text style={s.heading}>{property.name}</Text>
            <Text>{property.address}</Text>
            <Button
              title={`View ${property.name}`}
              disabled={busy}
              onPress={() => void run(() => open(property))}
            />
          </View>
        ))
      )}
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
});
