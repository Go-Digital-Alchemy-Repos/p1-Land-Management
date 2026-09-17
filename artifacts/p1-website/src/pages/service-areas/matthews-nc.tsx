import { LocationPage } from "@/components/content/LocationPage";
import pages from "@/lib/location-pages.json";
import hero from "@/assets/locations/matthews-nc.png";
export default function Page() { return <LocationPage page={pages.find(page => page.path === "/service-areas/matthews-nc")!} image={hero} />; }
