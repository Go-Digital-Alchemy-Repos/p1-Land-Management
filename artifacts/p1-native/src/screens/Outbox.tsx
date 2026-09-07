import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { OutboxItem, OutboxPage } from "../core/outbox";
/** Read-only retained captures; all loading and identity guards stay with Application. */
export function Outbox({
  page,
  busy,
  hasPrevious,
  onPrevious,
  onNext,
  onRefresh,
  onClose,
}: {
  page: OutboxPage;
  busy: boolean;
  hasPrevious: boolean;
  onPrevious(): void;
  onNext(): void;
  onRefresh(): void;
  onClose(): void;
}) {
  const [selected, setSelected] = useState<OutboxItem | null>(null);
  useEffect(() => {
    setSelected((current) =>
      current &&
      !page.items.some(
        (item) => item.id === current.id && item.kind === current.kind,
      )
        ? null
        : current,
    );
  }, [page.items]);

  if (selected)
    return (
      <View style={s.panel}>
        <Text accessibilityRole="header" style={s.heading}>
          {selected.detail.kind === "text"
            ? selected.detail.label
            : `${selected.label} details`}
        </Text>
        <Text>
          {selected.state === "conflict"
            ? "Needs office review. This capture remains protected on this device."
            : "Pending server acceptance. This capture remains protected on this device."}
        </Text>
        <Text selectable>Capture ID: {selected.id}</Text>
        <Text selectable>Work order: {selected.targetId}</Text>
        <Text>Captured: {new Date(selected.capturedAt).toLocaleString()}</Text>
        <SavedDetail item={selected} />
        <View style={s.control}>
          <OutboxControl
            title="Back to saved outbox"
            onPress={() => setSelected(null)}
            disabled={busy}
          />
        </View>
      </View>
    );

  return (
    <View style={s.panel}>
      <Text accessibilityRole="header" style={s.heading}>
        Saved outbox
      </Text>
      <Text accessibilityLiveRegion="polite">
        {page.total} saved · {page.pending} pending · {page.conflicts} needing
        office review
      </Text>
      <Text>
        Retained local capture history. Accepted items leave this device after
        acknowledgment; their history is available in the office dashboard.
      </Text>
      <Text>
        Pending items use Sync now after you reconnect. Conflicts stay protected
        for office review. No resolution has been confirmed, and this screen
        cannot discard or resolve them.
      </Text>
      <View style={s.control}>
        <OutboxControl
          title="Refresh outbox"
          onPress={onRefresh}
          disabled={busy}
        />
      </View>
      {!page.items.length && <Text>No retained captures on this page.</Text>}
      {page.items.map((item) => (
        <View key={item.kind + ":" + item.id} style={s.card}>
          <Text accessibilityRole="header" style={s.label}>
            {item.label} ·{" "}
            {item.state === "conflict"
              ? "Needs office review"
              : "Pending acceptance"}
          </Text>
          <Text selectable>Capture ID: {item.id}</Text>
          <Text selectable>Work order: {item.targetId}</Text>
          <Text>Captured: {new Date(item.capturedAt).toLocaleString()}</Text>
          <Text>{item.summary}</Text>
          <OutboxControl
            title={`Open saved ${item.label.toLowerCase()}`}
            onPress={() => setSelected(item)}
            disabled={busy}
          />
        </View>
      ))}
      <Text>
        Showing up to 50 captures, oldest first. Refresh after syncing to update
        the queue.
      </Text>
      <View style={s.control}>
        <OutboxControl
          title="Previous outbox page"
          onPress={onPrevious}
          disabled={busy || !hasPrevious}
        />
      </View>
      <View style={s.control}>
        <OutboxControl
          title="Next outbox page"
          onPress={onNext}
          disabled={busy || !page.nextCursor}
        />
      </View>
      <View style={s.control}>
        <OutboxControl title="Close outbox" onPress={onClose} disabled={busy} />
      </View>
    </View>
  );
}

function SavedDetail({ item }: { item: OutboxItem }) {
  switch (item.detail.kind) {
    case "text":
      return (
        <>
          <Text style={s.label}>{item.detail.label}</Text>
          <Text selectable>{item.detail.text || "No text was recorded."}</Text>
        </>
      );
    case "time":
      return <Text>Recorded action: {item.detail.action}</Text>;
    case "checklist":
      return (
        <>
          <Text style={s.label}>Saved checklist</Text>
          {item.detail.items.map((entry, index) => (
            <Text key={`${entry.label}:${index}`}>
              {entry.done ? "Checked" : "Unchecked"} · {entry.label}
            </Text>
          ))}
          {!item.detail.items.length ? (
            <Text>No checklist entries.</Text>
          ) : null}
        </>
      );
    case "complete":
      return (
        <Text>
          Completion was saved locally for office review. It has not been
          accepted, billed, or published.
        </Text>
      );
    case "photo":
      return (
        <Text>
          Saved {item.detail.classification} photo. Image bytes remain in
          private device storage and are not previewed here.
        </Text>
      );
  }
}
const s = StyleSheet.create({
  touch: {
    minHeight: 48,
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#185f35",
    borderRadius: 4,
  },
  touchLabel: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  disabled: { backgroundColor: "#dde4df" },
  disabledLabel: { color: "#52615a" },
  panel: { gap: 12 },
  heading: { fontSize: 22, fontWeight: "700", color: "#183e2a" },
  label: { fontSize: 18, fontWeight: "600", color: "#183e2a" },
  card: {
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#62776a",
    backgroundColor: "white",
  },
  control: { minHeight: 48, justifyContent: "center" },
});

function OutboxControl({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress(): void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[s.touch, disabled && s.disabled]}
    >
      <Text style={[s.touchLabel, disabled && s.disabledLabel]}>{title}</Text>
    </Pressable>
  );
}
