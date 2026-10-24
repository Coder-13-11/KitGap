// Where a drive found through Discover lives, and well-known programs that
// run every year. Each featured link was checked by hand; see docs/research.md.

export type PlatformId =
  | "signupgenius"
  | "justserve"
  | "facebook"
  | "instagram"
  | "linkedin"
  | "x"
  | "reddit"
  | "nextdoor"
  | "salvation_army"
  | "united_way"
  | "volunteer_hub"
  | "idealist"
  | "volunteermatch"
  | "eventbrite"
  | "news"
  | "web";

export const PLATFORM_LABEL: Record<PlatformId, string> = {
  signupgenius: "SignUpGenius",
  justserve: "JustServe",
  facebook: "Facebook post",
  instagram: "Instagram post",
  linkedin: "LinkedIn post",
  x: "Post on X",
  reddit: "Reddit",
  nextdoor: "Nextdoor",
  salvation_army: "Salvation Army",
  united_way: "United Way",
  volunteer_hub: "Volunteer site",
  idealist: "Idealist",
  volunteermatch: "VolunteerMatch",
  eventbrite: "Eventbrite",
  news: "Local news",
  web: "Website",
};

export function platformFor(url: string): PlatformId {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "web";
  }
  const is = (domain: string) => host === domain || host.endsWith(`.${domain}`);
  if (is("signupgenius.com")) return "signupgenius";
  if (is("justserve.org")) return "justserve";
  if (is("facebook.com") || is("fb.com")) return "facebook";
  if (is("instagram.com")) return "instagram";
  if (is("linkedin.com")) return "linkedin";
  if (is("x.com") || is("twitter.com")) return "x";
  if (is("reddit.com")) return "reddit";
  if (is("nextdoor.com")) return "nextdoor";
  if (host.includes("salvationarmy") || is("saangeltree.org") || is("registertoring.com")) return "salvation_army";
  if (host.includes("unitedway")) return "united_way";
  if (is("galaxydigital.com") || is("volunteerhub.com") || is("givepulse.com") || is("golden.com")) return "volunteer_hub";
  if (is("idealist.org")) return "idealist";
  if (is("volunteermatch.org")) return "volunteermatch";
  if (is("eventbrite.com")) return "eventbrite";
  if (/(news|fox\d+|abc\d*|nbc|cbs|wesh|wftv|clickorlando|patch\.com|tribune|times|post|herald|gazette)/.test(host)) return "news";
  return "web";
}

export interface FeaturedProgram {
  title: string;
  organizer: string;
  text: string;
  url: string;
  season: string;
}

export const FEATURED_PROGRAMS: FeaturedProgram[] = [
  {
    title: "Salvation Army Angel Tree",
    organizer: "The Salvation Army",
    text: "Pick a child's wish tag and buy the clothes or toys on it. Local units also need volunteers to sort gifts.",
    url: "https://www.salvationarmyusa.org/angel-tree-assistance/",
    season: "October to December",
  },
  {
    title: "Ring a Red Kettle bell",
    organizer: "The Salvation Army",
    text: "Sign your club up for a two-hour bell-ringing shift near you. Many schools count it as service hours.",
    url: "https://www.registertoring.com/group-find.aspx",
    season: "November to December",
  },
  {
    title: "Marine Toys for Tots",
    organizer: "U.S. Marine Corps Reserve",
    text: "Find your local campaign to drop off new, unwrapped toys or host a collection box.",
    url: "https://www.toysfortots.org/find-your-local-chapter/",
    season: "October to December",
  },
  {
    title: "Host a food drive",
    organizer: "Feeding America",
    text: "Start a food drive for your local food bank, which tells you what it needs most.",
    url: "https://www.feedingamerica.org/ways-to-give/food-drives",
    season: "All year",
  },
  {
    title: "Operation Backpack",
    organizer: "Volunteers of America",
    text: "Fill backpacks with school supplies for students in shelters and low-income families.",
    url: "https://www.voa.org/operation-backpack-2026/",
    season: "Summer",
  },
  {
    title: "Find a sign-up by organizer",
    organizer: "SignUpGenius",
    text: "Know the organizer's email? SignUpGenius lists their open sign-ups so you can join one.",
    url: "https://www.signupgenius.com/findasignup",
    season: "All year",
  },
];

export const DISCOVER_TOPICS = [
  "School supplies",
  "Food",
  "Hygiene kits",
  "Winter coats",
  "Toys",
  "Baby supplies",
  "Volunteering",
];
