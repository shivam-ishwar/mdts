import { useEffect, useMemo, useState } from "react";
import "../styles/image-container.css";
import type { CsrRegisterItem } from "../config/csrContent";

interface ImageContainerProps {
    imageUrl: string | string[];
    items?: CsrRegisterItem[];
}

const INITIAL_VISIBLE_THUMBNAILS = 5;
const AUTO_ROTATE_MS = 4500;

type GalleryCard = {
    id: string;
    image: string;
    title: string;
    caption: string;
    buttonLabel?: string;
};

const FALLBACK_CAPTION =
    "Add images to create a lighter project-side showcase without stacking large cards.";

const normalizeCard = (
    card: Partial<GalleryCard> | null | undefined,
    index: number
): GalleryCard | null => {
    const image = String(card?.image || "").trim();
    if (!image) return null;

    return {
        id: String(card?.id || `card-${index + 1}`),
        image,
        title: String(card?.title || `Card Heading ${index + 1}`).trim() || `Card Heading ${index + 1}`,
        caption: String(card?.caption || "").trim() || FALLBACK_CAPTION,
        buttonLabel: String(card?.buttonLabel || "").trim(),
    };
};

const ImageContainer = ({ imageUrl, items }: ImageContainerProps) => {
    const cards = useMemo(() => {
        const rawCards: Array<Partial<GalleryCard> | null | undefined> =
            items && items.length > 0
                ? items
                : Array.isArray(imageUrl)
                  ? imageUrl.map((img, index) => ({
                        id: `card-${index + 1}`,
                        image: img,
                        title: `Card Heading ${index + 1}`,
                        caption: FALLBACK_CAPTION,
                        buttonLabel: "Find out more",
                    }))
                  : [
                        {
                            id: "card-1",
                            image: imageUrl,
                            title: "Card Heading",
                            caption: FALLBACK_CAPTION,
                            buttonLabel: "Find out more",
                        },
                    ];

        return rawCards
            .map((card, index) => normalizeCard(card, index))
            .filter(Boolean) as GalleryCard[];
    }, [imageUrl, items]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        setActiveIndex((prev) => Math.min(prev, Math.max(cards.length - 1, 0)));
    }, [cards.length]);

    useEffect(() => {
        if (cards.length <= 1) return undefined;
        const timer = window.setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % cards.length);
        }, AUTO_ROTATE_MS);
        return () => window.clearInterval(timer);
    }, [cards.length]);

    const activeCard = cards[activeIndex] || null;
    const visibleCards = expanded ? cards : cards.slice(0, INITIAL_VISIBLE_THUMBNAILS);
    const hiddenCount = Math.max(cards.length - INITIAL_VISIBLE_THUMBNAILS, 0);

    if (!activeCard) {
        return (
            <main className="custom-main">
                <div className="custom-gallery-empty">
                    <div className="custom-gallery-empty-badge">Project Visuals</div>
                    <h2>No images available</h2>
                    <p>Upload at least one valid image to populate this showcase. Empty or incomplete items are skipped safely.</p>
                </div>
            </main>
        );
    }

    return (
        <main className="custom-main">
            <div className="custom-gallery-shell">
                <div className="custom-gallery-stage">
                    <div className="custom-gallery-stage-media">
                        <img
                            src={activeCard.image}
                            alt={activeCard.title || `Card ${activeIndex + 1}`}
                            className="custom-gallery-stage-image"
                            loading="eager"
                            decoding="async"
                        />
                        <div className="custom-gallery-stage-overlay" aria-hidden />
                        <div className="custom-gallery-stage-copy">
                            <span className="custom-gallery-kicker">Project Visuals</span>
                            <h2>{activeCard.title}</h2>
                            <p>{activeCard.caption}</p>
                            {activeCard.buttonLabel ? (
                                <span className="custom-button">{activeCard.buttonLabel}</span>
                            ) : null}
                        </div>
                    </div>

                    <div className="custom-gallery-summary">
                        <div className="custom-summary-pill">
                            {cards.length} {cards.length === 1 ? "image" : "images"}
                        </div>
                        <div className="custom-summary-block">
                            <span>Selected</span>
                            <strong>{String(activeIndex + 1).padStart(2, "0")}</strong>
                        </div>
                        <div className="custom-summary-block">
                            <span>Experience</span>
                            <strong>Compact showcase</strong>
                        </div>
                    </div>
                </div>

                <div className="custom-gallery-rail">
                    <div className="custom-gallery-rail-track">
                        {visibleCards.map((card, index) => (
                            <button
                                key={card.id || index}
                                type="button"
                                className={`custom-gallery-thumb ${index === activeIndex ? "custom-gallery-thumb--active" : ""}`}
                                onClick={() => setActiveIndex(index)}
                            >
                                <img
                                    src={card.image}
                                    alt={card.title || `Card ${index + 1}`}
                                    className="custom-gallery-thumb-image"
                                    loading="lazy"
                                    decoding="async"
                                />
                                <div className="custom-gallery-thumb-copy">
                                    <span>{String(index + 1).padStart(2, "0")}</span>
                                    <strong>{card.title}</strong>
                                </div>
                            </button>
                        ))}
                    </div>

                    {cards.length > INITIAL_VISIBLE_THUMBNAILS ? (
                        <button
                            type="button"
                            className="custom-gallery-toggle"
                            onClick={() => {
                                setExpanded((prev) => {
                                    const next = !prev;
                                    if (!next && activeIndex >= INITIAL_VISIBLE_THUMBNAILS) {
                                        setActiveIndex(0);
                                    }
                                    return next;
                                });
                            }}
                        >
                            {expanded ? "View less" : `View ${hiddenCount} more`}
                        </button>
                    ) : null}
                </div>
            </div>
        </main>
    );
};

export default ImageContainer;
