-- Site-reference photos remain staff/crew-only and independent of work-order evidence.
ALTER TABLE file_record ADD COLUMN description text;
ALTER TABLE file_record ADD CONSTRAINT file_record_description_length CHECK (description IS NULL OR char_length(description) <= 500);
CREATE INDEX file_record_property_photo_gallery_idx
  ON file_record(property_id, created_at DESC, id DESC)
  WHERE classification = 'property-photo' AND status = 'ready';
