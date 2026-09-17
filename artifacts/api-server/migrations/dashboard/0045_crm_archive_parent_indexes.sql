-- Parent-scoped history browsing uses source identity order without scanning other customers.
CREATE INDEX crm_archive_lead_history ON crm_source_record(lead_id,source_instance_id,source_table,source_id) WHERE lead_id IS NOT NULL;
CREATE INDEX crm_archive_client_history ON crm_source_record(client_id,source_instance_id,source_table,source_id) WHERE client_id IS NOT NULL;
