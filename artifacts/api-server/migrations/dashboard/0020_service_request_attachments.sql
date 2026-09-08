CREATE TABLE service_request_attachment (
  id uuid PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES service_request(id),
  file_id uuid NOT NULL UNIQUE REFERENCES file_record(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX service_request_attachment_request_created_idx
  ON service_request_attachment(request_id, created_at DESC);
