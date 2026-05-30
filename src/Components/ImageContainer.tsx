import { useMemo } from "react";
import type { CsrRegisterItem } from "../config/csrContent";
import ProjectVisualShowcase, { type ProjectVisualShowcaseImage } from "./ProjectVisualShowcase";

interface ImageContainerProps {
    imageUrl: string | string[];
    items?: CsrRegisterItem[];
}

const FALLBACK_CAPTION =
    "Add images to create a lighter project-side showcase without stacking large cards.";

const normalizeShowcaseImage = (
    card: Partial<ProjectVisualShowcaseImage> | CsrRegisterItem | null | undefined,
    index: number
): ProjectVisualShowcaseImage | null => {
    const registerItem = card as CsrRegisterItem | undefined;
    const showcaseItem = card as Partial<ProjectVisualShowcaseImage> | undefined;
    const src = String(registerItem?.image || showcaseItem?.src || "").trim();
    if (!src) return null;

    return {
        id: String(card?.id || `card-${index + 1}`),
        src,
        title:
            String(card?.title || `Card Heading ${index + 1}`).trim() || `Card Heading ${index + 1}`,
        description:
            String(registerItem?.caption || showcaseItem?.description || "").trim() || FALLBACK_CAPTION,
    };
};

const ImageContainer = ({ imageUrl, items }: ImageContainerProps) => {
    const images = useMemo(() => {
        const rawCards: Array<Partial<ProjectVisualShowcaseImage> | CsrRegisterItem | null | undefined> =
            items && items.length > 0
                ? items
                : Array.isArray(imageUrl)
                  ? imageUrl.map((img, index) => ({
                        id: `card-${index + 1}`,
                        image: img,
                        title: `Card Heading ${index + 1}`,
                        caption: FALLBACK_CAPTION,
                    }))
                  : [
                        {
                            id: "card-1",
                            image: imageUrl,
                            title: "Card Heading",
                            caption: FALLBACK_CAPTION,
                        },
                    ];

        return rawCards
            .map((card, index) => normalizeShowcaseImage(card, index))
            .filter(Boolean) as ProjectVisualShowcaseImage[];
    }, [imageUrl, items]);

    return <ProjectVisualShowcase images={images} />;
};

export default ImageContainer;
