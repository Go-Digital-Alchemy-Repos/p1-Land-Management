import { LocationPage } from "@/components/content/LocationPage";
import pages from "@/lib/location-pages.json";
import hero from "@/assets/locations/indian-land-sc.png";
export default function Page() { return <LocationPage page={pages.find(page => page.path === "/service-areas/indian-land-sc")!} image={hero} />; }
