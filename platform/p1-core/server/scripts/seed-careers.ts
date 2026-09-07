import { loadLocalEnv } from "../load-env";
import { ensureSystemCareers } from "../services/system-careers.service";
import { ensureSystemCmsPages } from "../services/system-cms-pages.service";

loadLocalEnv();

Promise.all([ensureSystemCmsPages(), ensureSystemCareers()])
  .then(() => {
    console.log("Career Center CMS page and seed jobs ensured.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
