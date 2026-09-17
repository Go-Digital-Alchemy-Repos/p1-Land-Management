import { LocationPage } from "@/components/content/LocationPage";
import pages from "@/lib/location-pages.json";
import hero from "@/assets/locations/kannapolis-nc.png";
export default function Page() { return <LocationPage page={pages.find(page => page.path === "/service-areas/kannapolis-nc")!} image={hero} />; }
