import { Mail, Tag, Cloud } from "lucide-react";
import { SiMailgun, SiMailchimp, SiCloudflare } from "./integration-provider-icons";
export const SUPPORTED_INTEGRATIONS = [
  {
    category: "mailgun",
    title: "Mailgun",
    description: "Transactional email delivery service",
    group: "communications",
    icon: Mail,
    brandIcon: SiMailgun,
    brandColor: "text-[#F06B66]",
    accountUrl: "https://app.mailgun.com/app/account/security/api_keys",
    docsUrl:
      "https://help.mailgun.com/hc/en-us/articles/203380100-Where-can-I-find-my-API-keys-and-SMTP-credentials",
    instructions: [
      "Open Mailgun API Security and create or copy an API key.",
      "Open Sending > Domains and copy the verified sending domain.",
      "Enter the from address exactly as messages should appear to recipients.",
    ],
    fields: [
      {
        key: "mailgun_api_key",
        label: "API Key",
        isSecret: true,
        placeholder: "key-...",
      },
      {
        key: "mailgun_domain",
        label: "Domain",
        isSecret: false,
        placeholder: "mg.yourdomain.com",
      },
      {
        key: "mailgun_from_address",
        label: "From Address",
        isSecret: false,
        placeholder: "Core Platform <noreply@yourdomain.com>",
      },
    ],
  },
  {
    category: "mailchimp",
    title: "Mailchimp",
    description: "Audience sync used by managed forms and lifecycle tagging",
    group: "marketing",
    icon: Tag,
    brandIcon: SiMailchimp,
    brandColor: "text-[#FFE01B]",
    libraryCategory: "Marketing & Analytics",
    capabilities: ["Audience sync", "Lifecycle tagging", "Email marketing"],
    accountUrl: "https://admin.mailchimp.com/account/api/",
    docsUrl: "https://mailchimp.com/help/about-api-keys/",
    instructions: [
      "Open Mailchimp API Keys and create or copy an active API key.",
      "Use the suffix after the API key hyphen as the Server Prefix, for example us6.",
      "Open Audience settings to copy the Audience ID for the list this site should sync to.",
    ],
    fields: [
      {
        key: "mailchimp_api_key",
        label: "API Key",
        isSecret: true,
        placeholder: "xxxxxxxxxxxxxxxxxxxx-us6",
      },
      {
        key: "mailchimp_audience_id",
        label: "Audience ID",
        isSecret: false,
        placeholder: "a1b2c3d4e5",
      },
      {
        key: "mailchimp_server_prefix",
        label: "Server Prefix",
        isSecret: false,
        placeholder: "us6",
      },
    ],
  },
  {
    category: "cloudflare_r2",
    title: "Cloudflare R2",
    description: "Object storage for images and file uploads",
    group: "infrastructure",
    icon: Cloud,
    brandIcon: SiCloudflare,
    brandColor: "text-[#F38020]",
    accountUrl: "https://dash.cloudflare.com/?to=/:account/r2/api-tokens",
    docsUrl: "https://developers.cloudflare.com/r2/api/s3/tokens/",
    instructions: [
      "Open Cloudflare R2 API tokens for the correct account.",
      "Create an Account API token with Object Read and Write access scoped to this bucket.",
      "Copy the Access Key ID and Secret Access Key immediately; Cloudflare only shows the secret once.",
      "Copy the Account ID from the R2 overview or account overview, then enter the bucket name.",
      "Leave Public URL blank unless you have a custom public domain. Do not use the r2.cloudflarestorage.com API endpoint as the Public URL.",
    ],
    fields: [
      {
        key: "r2_account_id",
        label: "Account ID",
        isSecret: false,
        placeholder: "Your Cloudflare Account ID",
      },
      {
        key: "r2_access_key_id",
        label: "Access Key ID",
        isSecret: true,
        placeholder: "Access key for R2",
      },
      {
        key: "r2_secret_access_key",
        label: "Secret Access Key",
        isSecret: true,
        placeholder: "Secret access key for R2",
      },
      {
        key: "r2_bucket_name",
        label: "Bucket Name",
        isSecret: false,
        placeholder: "core-platform-uploads",
      },
      {
        key: "r2_public_url",
        label: "Public URL",
        isSecret: false,
        placeholder: "https://cdn.yourdomain.com",
      },
    ],
  },
];
