export type CsrVisualItem = {
  id: string;
  image: string;
  title: string;
  caption: string;
};

export type CsrRegisterItem = {
  id: string;
  image: string;
  title: string;
  caption: string;
  buttonLabel?: string;
};

export type CsrContentConfig = {
  homeHeroImage: string;
  homeHeroQuote: string;
  homeHeroBody: string;
  homeHeroVideo?: string;
  homeHeroVideoPoster?: string;
  homeVisualHeading: string;
  homeVisualSubheading: string;
  homeVisualItems: CsrVisualItem[];
  registerProjectItems: CsrRegisterItem[];
};

export const defaultCsrContentConfig: CsrContentConfig = {
  homeHeroImage: "/adaniimage.jpg",
  homeHeroQuote: '"What gets delayed gets costly. What gets tracked gets delivered."',
  homeHeroBody:
    "MDTS gives the organization a sharper operating window with real-time visibility, structured ownership, and execution discipline that keeps every milestone moving.",
  homeHeroVideo: "",
  homeHeroVideoPoster: "",
  homeVisualHeading: "Image-led workspace moments",
  homeVisualSubheading:
    "Different image treatments make the homepage feel more alive while keeping the visual language tied to mining, delivery, and execution.",
  homeVisualItems: [
    {
      id: "vs1",
      title: "Field execution",
      caption: "Operational visibility with imagery that reflects ground reality and delivery momentum.",
      image: "/mining2.jpg",
    },
    {
      id: "vs2",
      title: "Leadership review",
      caption: "A sharper visual layer for portfolio review, readiness, and decision-making.",
      image: "/banner2.jpg",
    },
    {
      id: "vs3",
      title: "Delivery context",
      caption: "Different visual treatments help the workspace feel richer without losing structure.",
      image: "/mining4.jpg",
    },
    {
      id: "vs4",
      title: "Site intelligence",
      caption: "Visual snapshots that connect planning decisions with what teams are seeing on the ground.",
      image: "/mining3.jpg",
    },
    {
      id: "vs5",
      title: "Operational landscape",
      caption: "Broader visual context for mining operations, movement, and infrastructure at scale.",
      image: "/mining5.jpg",
    },
  ],
  registerProjectItems: [
    {
      id: "rp1",
      image: "/images/auths/m5.jpg",
      title: "Project planning",
      caption: "Capture project information in a structured flow that keeps registration consistent.",
      buttonLabel: "Learn more",
    },
    {
      id: "rp2",
      image: "/images/auths/m5.jpg",
      title: "Execution setup",
      caption: "Build a stronger foundation for project monitoring, readiness, and traceability.",
      buttonLabel: "Explore",
    },
    {
      id: "rp3",
      image: "/images/auths/m5.jpg",
      title: "Portfolio discipline",
      caption: "Use consistent project data to support delivery governance and downstream reporting.",
      buttonLabel: "View details",
    },
  ],
};

const normalizeVisualItem = (item: Partial<CsrVisualItem>, index: number): CsrVisualItem | null => {
  const image = String(item?.image || "").trim();
  if (!image) return null;
  return {
    id: String(item?.id || `visual-${index + 1}`),
    image,
    title: String(item?.title || `Visual ${index + 1}`).trim() || `Visual ${index + 1}`,
    caption: String(item?.caption || "").trim(),
  };
};

const normalizeRegisterItem = (item: Partial<CsrRegisterItem>, index: number): CsrRegisterItem | null => {
  const image = String(item?.image || "").trim();
  if (!image) return null;
  return {
    id: String(item?.id || `register-${index + 1}`),
    image,
    title: String(item?.title || `Card ${index + 1}`).trim() || `Card ${index + 1}`,
    caption: String(item?.caption || "").trim(),
    buttonLabel: String(item?.buttonLabel || "").trim(),
  };
};

export const normalizeCsrContentConfig = (value: any): CsrContentConfig => {
  const config = value && typeof value === "object" ? value : {};
  const hasHomeVisualItems = Array.isArray(config.homeVisualItems);
  const hasRegisterProjectItems = Array.isArray(config.registerProjectItems);
  const homeVisualItems =
    hasHomeVisualItems
      ? config.homeVisualItems.map(normalizeVisualItem).filter(Boolean) as CsrVisualItem[]
      : [];
  const registerProjectItems =
    hasRegisterProjectItems
      ? config.registerProjectItems.map(normalizeRegisterItem).filter(Boolean) as CsrRegisterItem[]
      : [];

  return {
    homeHeroImage: String(config.homeHeroImage || defaultCsrContentConfig.homeHeroImage).trim() || defaultCsrContentConfig.homeHeroImage,
    homeHeroQuote: String(config.homeHeroQuote || defaultCsrContentConfig.homeHeroQuote).trim() || defaultCsrContentConfig.homeHeroQuote,
    homeHeroBody: String(config.homeHeroBody || defaultCsrContentConfig.homeHeroBody).trim() || defaultCsrContentConfig.homeHeroBody,
    homeHeroVideo: String(config.homeHeroVideo || "").trim(),
    homeHeroVideoPoster: String(config.homeHeroVideoPoster || "").trim(),
    homeVisualHeading:
      String(config.homeVisualHeading || defaultCsrContentConfig.homeVisualHeading).trim() || defaultCsrContentConfig.homeVisualHeading,
    homeVisualSubheading:
      String(config.homeVisualSubheading || defaultCsrContentConfig.homeVisualSubheading).trim() ||
      defaultCsrContentConfig.homeVisualSubheading,
    homeVisualItems: hasHomeVisualItems ? homeVisualItems : defaultCsrContentConfig.homeVisualItems,
    registerProjectItems:
      hasRegisterProjectItems ? registerProjectItems : defaultCsrContentConfig.registerProjectItems,
  };
};
