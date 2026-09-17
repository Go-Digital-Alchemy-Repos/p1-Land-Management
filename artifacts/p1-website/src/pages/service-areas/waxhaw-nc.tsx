import { LocationPage } from "@/components/content/LocationPage";
import pages from "@/lib/location-pages.json";
import hero from "@/assets/locations/waxhaw-nc.png";
export default function Page() { return <LocationPage page={pages.find(page => page.path === "/service-areas/waxhaw-nc")!} image={hero} />; }
