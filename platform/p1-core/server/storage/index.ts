import { UserStorage } from "./user.storage";
import { EventStorage } from "./event.storage";
import { EventOrganizersStorage, EventVenuesStorage } from "./event-taxonomy.storage";
import { ContactStorage } from "./contact.storage";
import { DocsStorage } from "./docs.storage";
import { PasswordResetStorage } from "./password-reset.storage";
import { SettingsStorage } from "./settings.storage";
import { EmailTemplateStorage } from "./email-template.storage";
import { ActivityStorage } from "./activity.storage";
import { NotificationStorage } from "./notification.storage";
import { BlogStorage } from "./blog.storage";
import { BlogCommentsStorage } from "./blog-comments.storage";
import { BlogTaxonomyStorage } from "./blog-taxonomy.storage";
import { EventRegistrationStorage } from "./event-registration.storage";
import { CmsPagesStorage } from "./cms-pages.storage";
import { CmsPageRevisionsStorage } from "./cms-page-revisions.storage";
import { CmsMediaStorage } from "./cms-media.storage";
import { CmsSectionsStorage } from "./cms-sections.storage";
import { CmsGalleriesStorage } from "./cms-galleries.storage";
import { SeoSettingsStorage } from "./seo-settings.storage";
import { RedirectsStorage } from "./redirects.storage";
import { RecordingPurchaseStorage } from "./recording-purchase.storage";
import { CmsMenusStorage } from "./cms-menus.storage";
import { CmsSidebarsStorage } from "./cms-sidebars.storage";
import { FormsStorage } from "./forms.storage";
import { EditorLocksStorage } from "./editor-locks.storage";
import { CrmStorage } from "./crm.storage";
import { CareerStorage } from "./career.storage";
import { TeamStorage } from "./team.storage";
import { ClientSiteContentStorage } from "./client-site-content.storage";
import { ClientStackOnboardingStorage } from "./client-stack-onboarding.storage";
export const storage = {
  team: new TeamStorage(),
  users: new UserStorage(),
  events: new EventStorage(),
  eventVenues: new EventVenuesStorage(),
  eventOrganizers: new EventOrganizersStorage(),
  contacts: new ContactStorage(),
  docs: new DocsStorage(),
  passwordResets: new PasswordResetStorage(),
  settings: new SettingsStorage(),
  emailTemplates: new EmailTemplateStorage(),
  activity: new ActivityStorage(),
  notifications: new NotificationStorage(),
  blog: new BlogStorage(),
  blogComments: new BlogCommentsStorage(),
  blogTaxonomies: new BlogTaxonomyStorage(),
  eventRegistrations: new EventRegistrationStorage(),
  cmsPages: new CmsPagesStorage(),
  cmsPageRevisions: new CmsPageRevisionsStorage(),
  cmsMedia: new CmsMediaStorage(),
  cmsSections: new CmsSectionsStorage(),
  cmsGalleries: new CmsGalleriesStorage(),
  seoSettings: new SeoSettingsStorage(),
  redirects: new RedirectsStorage(),
  recordingPurchases: new RecordingPurchaseStorage(),
  cmsMenus: new CmsMenusStorage(),
  cmsSidebars: new CmsSidebarsStorage(),
  forms: new FormsStorage(),
  editorLocks: new EditorLocksStorage(),
  crm: new CrmStorage(),
  careers: new CareerStorage(),
  clientSiteContent: new ClientSiteContentStorage(),
  clientStackOnboarding: new ClientStackOnboardingStorage(),
};

export type {
  TherapistWithUser,
  PaginatedTherapists,
  DirectoryFilterOptions,
  TherapistSearchParams,
} from "@shared/types/directory";
